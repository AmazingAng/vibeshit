"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { products, votes, comments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { slugify as translitSlugify } from "transliteration";

const LOW_QUALITY_REJECTION_MESSAGE = "Submission failed: this quality is beneath shit-tier. Please vibe harder and improve your 💩 quality.";
const AI_REVIEW_MODEL = process.env.AI_REVIEW_MODEL || "gpt-5.3-codex";
const AI_REVIEW_BASE_URL = process.env.AI_REVIEW_BASE_URL || "http://changme.sbs:8317/v1";
const AI_REVIEW_API_KEY = process.env.AI_REVIEW_API_KEY || "sk-2fap4Q1fzpvMy0AA";

const requiredImageUrlSchema = z.string().trim().refine(
  (val) =>
    val.startsWith("/api/image/") ||
    val.startsWith("http://") ||
    val.startsWith("https://"),
  { message: "Invalid image URL" }
);

const imagesSchema = z.string().transform((val) => {
  try {
    const arr = JSON.parse(val) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((u): u is string => typeof u === "string" && u.length > 0).slice(0, 4);
  } catch {
    return [];
  }
}).pipe(
  z.array(z.string().trim().min(1)).min(1, "At least one screenshot is required")
);

const submitSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  tagline: z.string().trim().min(1, "Tagline is required").max(120),
  description: z.string().trim().min(1, "Description is required").max(2000),
  url: z.string().url("Invalid URL"),
  logoUrl: requiredImageUrlSchema,
  images: imagesSchema.optional(),
  githubUrl: z
    .union([z.literal(""), z.string().url("Invalid GitHub URL")])
    .refine(
      (val) => val === "" || parseGitHubRepoUrl(val) !== null,
      "GitHub URL must be a repository URL"
    ),
  agent: z.string().trim().min(1, "Agent is required").max(100),
  llm: z.string().trim().min(1, "LLM is required").max(100),
  tags: z.string().max(500).optional(),
});

type GithubRepoRef = {
  owner: string;
  repo: string;
  url: string;
};

type GithubRepoContext = {
  repo: GithubRepoRef;
  defaultBranch: string;
  stars: number;
  description: string | null;
  snippets: Array<{ path: string; content: string }>;
};

function parseGitHubRepoUrl(input: string): GithubRepoRef | null {
  try {
    const u = new URL(input);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0].trim();
    const repo = parts[1].replace(/\.git$/, "").trim();
    if (!owner || !repo) return null;
    return {
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
    };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function isProjectUrlReachable(url: string): Promise<boolean> {
  try {
    const headRes = await fetchWithTimeout(url, {
      method: "HEAD",
      redirect: "follow",
    }, 6000);
    if (headRes.ok || (headRes.status >= 300 && headRes.status < 400)) return true;
  } catch {
    // Fallback to GET for servers that reject HEAD
  }

  try {
    const getRes = await fetchWithTimeout(url, {
      method: "GET",
      redirect: "follow",
      headers: { Range: "bytes=0-0" },
    }, 7000);
    return getRes.ok || (getRes.status >= 300 && getRes.status < 400);
  } catch {
    return false;
  }
}

async function fetchGitHubRepoContext(repo: GithubRepoRef): Promise<GithubRepoContext | null> {
  const repoRes = await fetchWithTimeout(
    `https://api.github.com/repos/${repo.owner}/${repo.repo}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "vibeshit-quality-check",
      },
    },
    8000
  );

  if (repoRes.status === 404) return null;
  if (!repoRes.ok) {
    throw new Error(`Failed to access GitHub repo: ${repoRes.status}`);
  }

  const repoJson = (await repoRes.json()) as {
    default_branch?: string;
    stargazers_count?: number;
    description?: string | null;
  };
  const defaultBranch = repoJson.default_branch || "main";

  const treeRes = await fetchWithTimeout(
    `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "vibeshit-quality-check",
      },
    },
    10000
  );

  let candidatePaths: string[] = ["README.md", "readme.md", "README.MD"];

  if (treeRes.ok) {
    const treeJson = (await treeRes.json()) as {
      tree?: Array<{ path?: string; type?: string; size?: number }>;
    };
    const textFileRegex = /\.(md|txt|json|js|jsx|ts|tsx|py|go|rs|java|toml|yml|yaml)$/i;
    const fromTree = (treeJson.tree ?? [])
      .filter((node) => node.type === "blob" && typeof node.path === "string")
      .filter((node) => (node.size ?? 0) > 0 && (node.size ?? 0) < 50000)
      .map((node) => node.path as string)
      .filter((path) => textFileRegex.test(path))
      .slice(0, 8);
    candidatePaths = Array.from(new Set([...candidatePaths, ...fromTree]));
  }

  const snippets: Array<{ path: string; content: string }> = [];
  for (const filePath of candidatePaths) {
    if (snippets.length >= 4) break;
    try {
      const rawRes = await fetchWithTimeout(
        `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${encodeURIComponent(defaultBranch)}/${filePath}`,
        { headers: { "User-Agent": "vibeshit-quality-check" } },
        7000
      );
      if (!rawRes.ok) continue;
      const content = (await rawRes.text()).trim();
      if (!content) continue;
      snippets.push({
        path: filePath,
        content: content.slice(0, 2500),
      });
    } catch {
      // Ignore single file fetch failures.
    }
  }

  return {
    repo,
    defaultBranch,
    stars: repoJson.stargazers_count ?? 0,
    description: repoJson.description ?? null,
    snippets,
  };
}

function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

async function runAiQualityCheck(input: {
  description: string;
  projectUrl: string;
  githubContext: GithubRepoContext | null;
}): Promise<{ reject: boolean }> {
  const snippetsText = input.githubContext
    ? input.githubContext.snippets
        .map((s) => `FILE: ${s.path}\n${s.content}`)
        .join("\n\n---\n\n")
    : "No GitHub repo context provided.";

  const userPrompt = [
    "You are reviewing a project submission for quality gate.",
    "Reject only when quality is extremely poor, spammy, meaningless, or obviously fake.",
    "Focus on project description quality and (if provided) repository quality.",
    "Respond as strict JSON: {\"reject\": boolean, \"reason\": string}",
    "",
    `Project URL: ${input.projectUrl}`,
    `Description: ${input.description}`,
    `GitHub Repo: ${input.githubContext?.repo.url ?? "N/A"}`,
    `GitHub Stars: ${input.githubContext?.stars ?? 0}`,
    `GitHub Description: ${input.githubContext?.description ?? "N/A"}`,
    "",
    "Repository raw content snippets:",
    snippetsText,
  ].join("\n");

  const aiRes = await fetchWithTimeout(
    `${AI_REVIEW_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_REVIEW_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_REVIEW_MODEL,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You are a strict but fair reviewer. Return JSON only with keys reject(boolean) and reason(string).",
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    },
    15000
  );

  if (!aiRes.ok) {
    throw new Error(`AI review request failed: ${aiRes.status}`);
  }

  const aiJson = (await aiRes.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = aiJson.choices?.[0]?.message?.content ?? "";
  const jsonStr = extractJsonObject(content);
  if (!jsonStr) {
    throw new Error("AI review returned invalid payload");
  }
  const parsed = JSON.parse(jsonStr) as { reject?: boolean };
  return { reject: parsed.reject === true };
}

async function runSubmissionQualityGate(data: {
  description: string;
  url: string;
  githubUrl: string;
}): Promise<string | null> {
  const urlRepo = parseGitHubRepoUrl(data.url);
  const githubRepo = data.githubUrl ? parseGitHubRepoUrl(data.githubUrl) : null;
  const repoToCheck = urlRepo ?? githubRepo;

  if (!urlRepo) {
    const reachable = await isProjectUrlReachable(data.url);
    if (!reachable) {
      return "Project URL is unreachable. Please verify the URL and try again.";
    }
  }

  let githubContext: GithubRepoContext | null = null;
  if (repoToCheck) {
    githubContext = await fetchGitHubRepoContext(repoToCheck);
    if (!githubContext) {
      return "GitHub repo does not exist or is not publicly accessible.";
    }
  }

  const aiResult = await runAiQualityCheck({
    description: data.description,
    projectUrl: data.url,
    githubContext,
  });

  if (aiResult.reject) {
    return LOW_QUALITY_REJECTION_MESSAGE;
  }

  return null;
}

function slugify(text: string): string {
  const slug = translitSlugify(text, {
    lowercase: true,
    separator: "-",
    allowedChars: "a-zA-Z0-9",
  }).slice(0, 60);
  return slug || `project-${Math.random().toString(36).slice(2, 8)}`;
}

export async function submitProduct(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const raw = {
    name: formData.get("name") as string,
    tagline: formData.get("tagline") as string,
    description: (formData.get("description") as string) || "",
    url: formData.get("url") as string,
    logoUrl: (formData.get("logoUrl") as string) || "",
    images: (formData.get("images") as string) || "[]",
    githubUrl: (formData.get("githubUrl") as string) || "",
    agent: (formData.get("agent") as string) || "",
    llm: (formData.get("llm") as string) || "",
    tags: (formData.get("tags") as string) || undefined,
  };

  const result = submitSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const data = result.data;
  try {
    const gateError = await runSubmissionQualityGate({
      description: data.description,
      url: data.url,
      githubUrl: data.githubUrl,
    });
    if (gateError) {
      return { error: gateError };
    }
  } catch {
    return {
      error: "AI quality check is temporarily unavailable. Please try again later.",
    };
  }

  const imageUrls = data.images ?? [];
  let slug = slugify(data.name);

  const existing = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const today = new Date().toISOString().split("T")[0];

  const tagsArray = data.tags
    ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  await db.insert(products).values({
    name: data.name,
    slug,
    tagline: data.tagline,
    description: data.description || null,
    url: data.url,
    logoUrl: data.logoUrl || null,
    bannerUrl: imageUrls[0] || null,
    images: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
    githubUrl: data.githubUrl || null,
    agent: data.agent || null,
    llm: data.llm || null,
    tags: tagsArray.length > 0 ? JSON.stringify(tagsArray) : null,
    userId: session.user.id,
    launchDate: today,
  });

  redirect(`/product/${slug}`);
}

export async function updateProduct(slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });
  if (!product) return { error: "Product not found" };
  if (product.userId !== session.user.id) return { error: "Not authorized" };

  const raw = {
    name: formData.get("name") as string,
    tagline: formData.get("tagline") as string,
    description: (formData.get("description") as string) || "",
    url: formData.get("url") as string,
    logoUrl: (formData.get("logoUrl") as string) || "",
    images: (formData.get("images") as string) || "[]",
    githubUrl: (formData.get("githubUrl") as string) || "",
    agent: (formData.get("agent") as string) || "",
    llm: (formData.get("llm") as string) || "",
    tags: (formData.get("tags") as string) || undefined,
  };

  const result = submitSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const data = result.data;
  const imageUrls = data.images ?? [];
  const tagsArray = data.tags
    ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  await db
    .update(products)
    .set({
      name: data.name,
      tagline: data.tagline,
      description: data.description || null,
      url: data.url,
      logoUrl: data.logoUrl || null,
      bannerUrl: imageUrls[0] || null,
      images: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
      githubUrl: data.githubUrl || null,
      agent: data.agent || null,
      llm: data.llm || null,
      tags: tagsArray.length > 0 ? JSON.stringify(tagsArray) : null,
    })
    .where(eq(products.slug, slug));

  revalidatePath(`/product/${slug}`);
  revalidatePath("/");
  redirect(`/product/${slug}`);
}

export async function deleteProduct(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });
  if (!product) return { error: "Product not found" };
  if (product.userId !== session.user.id) return { error: "Not authorized" };

  await db.delete(comments).where(eq(comments.productId, product.id));
  await db.delete(votes).where(eq(votes.productId, product.id));
  await db.delete(products).where(eq(products.id, product.id));

  revalidatePath("/");
  redirect("/");
}

export async function updateProductStatus(
  productId: string,
  status: "approved" | "rejected"
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const { users } = await import("@/lib/db/schema");
  const user = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user[0] || user[0].role !== "admin") {
    return { error: "Not authorized" };
  }

  await db.update(products).set({ status }).where(eq(products.id, productId));
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}
