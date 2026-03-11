"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { products, votes, comments, users, eventLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { slugify as translitSlugify } from "transliteration";

import type { Database } from "@/lib/db";

async function logEvent(
  db: Database,
  type: string,
  level: "info" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>,
  userId?: string
) {
  try {
    await db.insert(eventLogs).values({
      type,
      level,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      userId: userId ?? null,
    });
  } catch {
    // Never let logging break the main flow
  }
}

const LOW_QUALITY_REJECTION_MESSAGE = "提交失败，请用力 vibe，提高 💩 的质量。";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "MiniMax-M2.5";
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || "https://api.minimaxi.com/anthropic";
const FALLBACK_MODEL = process.env.AI_REVIEW_MODEL || "claude-sonnet-4-20250514";
const FALLBACK_BASE_URL = process.env.AI_REVIEW_BASE_URL || "https://api.skyapi.org";

function resolveApiKeys(cfEnv: Record<string, unknown>) {
  return {
    anthropicApiKey: String(cfEnv.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || ""),
    openaiApiKey: String(cfEnv.AI_REVIEW_API_KEY || process.env.AI_REVIEW_API_KEY || ""),
    githubToken: String(cfEnv.GITHUB_TOKEN || process.env.GITHUB_TOKEN || ""),
  };
}
const SUBMIT_GUARD_RESET_MS = 30 * 60 * 1000;
const SUBMIT_GUARD_BASE_COOLDOWN_MS = 5000;
const SUBMIT_GUARD_MAX_COOLDOWN_MS = 10 * 60 * 1000;
let submitGuardTableEnsured = false;

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
  makerName: z.string().trim().max(100).optional(),
  makerLink: z.union([z.literal(""), z.string().url("Invalid maker link")]).optional(),
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

type SubmitGuardState = {
  strike: number;
  lastAttemptAt: number;
  nextAllowedAt: number;
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

async function fetchGitHubRepoContext(repo: GithubRepoRef, githubToken?: string): Promise<GithubRepoContext | null> {
  const ghHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "vibeshit-quality-check",
  };
  if (githubToken) {
    ghHeaders.Authorization = `Bearer ${githubToken}`;
  }

  const repoRes = await fetchWithTimeout(
    `https://api.github.com/repos/${repo.owner}/${repo.repo}`,
    { headers: ghHeaders },
    8000
  );

  if (!repoRes.ok) return null;

  const repoJson = (await repoRes.json()) as {
    default_branch?: string;
    stargazers_count?: number;
    description?: string | null;
  };
  const defaultBranch = repoJson.default_branch || "main";

  const treeRes = await fetchWithTimeout(
    `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
    { headers: ghHeaders },
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
        { headers: ghHeaders },
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

async function ensureSubmitGuardTable(envDb: D1Database): Promise<void> {
  if (submitGuardTableEnsured) return;
  await envDb.exec(`
    CREATE TABLE IF NOT EXISTS submit_ai_guards (
      user_id TEXT PRIMARY KEY,
      strike INTEGER NOT NULL,
      last_attempt_at INTEGER NOT NULL,
      next_allowed_at INTEGER NOT NULL
    );
  `);
  submitGuardTableEnsured = true;
}

async function getSubmitGuardState(envDb: D1Database, userId: string): Promise<SubmitGuardState | null> {
  const row = await envDb
    .prepare(
      `SELECT strike, last_attempt_at as lastAttemptAt, next_allowed_at as nextAllowedAt
       FROM submit_ai_guards
       WHERE user_id = ?1
       LIMIT 1`
    )
    .bind(userId)
    .first<SubmitGuardState>();

  if (!row) return null;
  return {
    strike: Math.max(0, Math.floor(row.strike)),
    lastAttemptAt: Math.max(0, Math.floor(row.lastAttemptAt)),
    nextAllowedAt: Math.max(0, Math.floor(row.nextAllowedAt)),
  };
}

async function upsertSubmitGuardState(
  envDb: D1Database,
  userId: string,
  state: SubmitGuardState
): Promise<void> {
  await envDb
    .prepare(
      `INSERT INTO submit_ai_guards (user_id, strike, last_attempt_at, next_allowed_at)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(user_id) DO UPDATE SET
         strike = excluded.strike,
         last_attempt_at = excluded.last_attempt_at,
         next_allowed_at = excluded.next_allowed_at`
    )
    .bind(userId, state.strike, state.lastAttemptAt, state.nextAllowedAt)
    .run();
}

async function applySubmitCooldownGuard(envDb: D1Database, userId: string): Promise<string | null> {
  await ensureSubmitGuardTable(envDb);

  const now = Date.now();
  const prev = await getSubmitGuardState(envDb, userId);
  if (prev && now < prev.nextAllowedAt) {
    const waitSeconds = Math.max(1, Math.ceil((prev.nextAllowedAt - now) / 1000));
    return `💩 拉的太频繁，请 ${waitSeconds} 秒后再试。`;
  }

  const shouldReset = !prev || now - prev.lastAttemptAt > SUBMIT_GUARD_RESET_MS;
  const strike = shouldReset ? 1 : Math.min(12, prev.strike + 1);
  const cooldownMs = Math.min(
    SUBMIT_GUARD_MAX_COOLDOWN_MS,
    SUBMIT_GUARD_BASE_COOLDOWN_MS * Math.pow(2, strike - 1)
  );

  await upsertSubmitGuardState(envDb, userId, {
    strike,
    lastAttemptAt: now,
    nextAllowedAt: now + cooldownMs,
  });

  return null;
}

async function runAiQualityCheck(input: {
  description: string;
  projectUrl: string;
  githubContext: GithubRepoContext | null;
  anthropicApiKey: string;
  openaiApiKey: string;
}): Promise<{ reject: boolean; reason?: string }> {
  const snippetsText = input.githubContext
    ? input.githubContext.snippets
        .map((s) => `FILE: ${s.path}\n${s.content}`)
        .join("\n\n---\n\n")
    : "No GitHub repo context provided.";

  const userPrompt = [
    "You are reviewing a project submission for a developer community site called Vibe Shit (for vibe coders).",
    "Be moderate — only REJECT submissions that are truly terrible:",
    "- Pure gibberish, random characters, or keyboard mashing (e.g. 'asdf', 'qwerty', 'aaaaaa')",
    "- Completely empty or meaningless descriptions (e.g. 'test', 'hello', single random word)",
    "- Obvious spam or bot-generated garbage",
    "APPROVE anything that makes a reasonable attempt to describe a project, even if brief or casual.",
    "This is a vibe coding community — casual tone is fine. When in doubt, APPROVE.",
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

  // Prefer MiniMax Anthropic-format API; fallback to OpenAI-compatible provider.
  const { anthropicApiKey, openaiApiKey } = input;
  if (anthropicApiKey) {
    try {
    const anthropicRes = await fetchWithTimeout(
      `${ANTHROPIC_BASE_URL.replace(/\/$/, "")}/v1/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 40000,
          temperature: 0.1,
          system:
            "You are a moderate quality reviewer for a vibe coding community. Only reject pure gibberish, spam, or completely meaningless submissions. Casual and brief descriptions are fine. When in doubt, approve. Return JSON only: {\"reject\": boolean, \"reason\": string}",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: userPrompt,
                },
              ],
            },
          ],
        }),
      },
      30000
    );

    if (!anthropicRes.ok) {
      throw new Error(`Anthropic review request failed: ${anthropicRes.status}`);
    }

    const anthropicJson = (await anthropicRes.json()) as {
      content?: Array<{ type?: string; text?: string; thinking?: string }>;
    };
    // Extract text from all content blocks (text + thinking)
    const allText = (anthropicJson.content ?? [])
      .map((part) => {
        if (part.type === "text" && typeof part.text === "string") return part.text;
        if (part.type === "thinking" && typeof part.thinking === "string") return part.thinking;
        return "";
      })
      .filter(Boolean)
      .join("\n");
    const jsonStr = extractJsonObject(allText);
    if (!jsonStr) {
      // Default to not rejecting if we can't parse the response
      console.error("[AI Review] Could not parse MiniMax response, allowing submission. Raw:", allText.slice(0, 500));
      return { reject: false };
    }
    const parsed = JSON.parse(jsonStr) as { reject?: boolean; reason?: string };
    return { reject: parsed.reject === true, reason: parsed.reason };
    } catch (err) {
      console.error("[AI Review] MiniMax failed, falling through:", err);
      // Fall through to OpenAI-compatible fallback.
    }
  }

  if (!openaiApiKey) {
    throw new Error("No AI review API key configured");
  }

  {
    const fallbackRes = await fetchWithTimeout(
      `${FALLBACK_BASE_URL.replace(/\/$/, "")}/v1/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": openaiApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: FALLBACK_MODEL,
          max_tokens: 1024,
          temperature: 0.1,
          system:
            "You are a moderate quality reviewer for a vibe coding community. Only reject pure gibberish, spam, or completely meaningless submissions. Casual and brief descriptions are fine. When in doubt, approve. Return JSON only: {\"reject\": boolean, \"reason\": string}",
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: userPrompt }],
            },
          ],
        }),
      },
      30000
    );

    if (!fallbackRes.ok) {
      throw new Error(`Fallback Claude review request failed: ${fallbackRes.status}`);
    }

    const fallbackJson = (await fallbackRes.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const fallbackText = (fallbackJson.content ?? [])
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text ?? "")
      .join("\n");
    const jsonStr = extractJsonObject(fallbackText);
    if (!jsonStr) {
      console.error("[AI Review] Fallback Claude response unparseable, allowing submission. Raw:", fallbackText.slice(0, 500));
      return { reject: false };
    }
    const parsed = JSON.parse(jsonStr) as { reject?: boolean; reason?: string };
    return { reject: parsed.reject === true, reason: parsed.reason };
  }
}

async function runSubmissionQualityGate(data: {
  description: string;
  url: string;
  githubUrl: string;
  anthropicApiKey: string;
  openaiApiKey: string;
  githubToken: string;
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
    githubContext = await fetchGitHubRepoContext(repoToCheck, data.githubToken);
    if (!githubContext) {
      return "GitHub repo does not exist or is not publicly accessible.";
    }
  }

  const aiResult = await runAiQualityCheck({
    description: data.description,
    projectUrl: data.url,
    githubContext,
    anthropicApiKey: data.anthropicApiKey,
    openaiApiKey: data.openaiApiKey,
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
    makerName: (formData.get("makerName") as string) || undefined,
    makerLink: (formData.get("makerLink") as string) || undefined,
  };

  const result = submitSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const data = result.data;
  try {
    const cooldownError = await applySubmitCooldownGuard(env.DB, session.user.id);
    if (cooldownError) {
      return { error: cooldownError };
    }
  } catch {
    // Fail open: guard issues should not block legitimate submissions.
  }

  const apiKeys = resolveApiKeys(env as unknown as Record<string, unknown>);
  try {
    const gateError = await runSubmissionQualityGate({
      description: data.description,
      url: data.url,
      githubUrl: data.githubUrl,
      ...apiKeys,
    });
    if (gateError) {
      await logEvent(db, "ai_review", "warn", `Submission rejected: ${gateError}`, { url: data.url, name: data.name }, session.user.id);
      return { error: gateError };
    }
    await logEvent(db, "ai_review", "info", "AI review passed", { url: data.url, name: data.name }, session.user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Fail open: if both AI providers are down, let the submission through
    await logEvent(db, "ai_review", "error", `AI review failed (allowing submission): ${msg}`, { url: data.url, name: data.name }, session.user.id);
  }

  // Idempotency: reject if same user already submitted a product with the same name
  const duplicate = await db.query.products.findFirst({
    where: (p, { eq, and }) => and(eq(p.userId, session.user.id), eq(p.name, data.name)),
  });
  if (duplicate) {
    redirect(`/product/${duplicate.slug}`);
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
    makerName: data.makerName || null,
    makerLink: data.makerLink || null,
    userId: session.user.id,
    launchDate: today,
  });

  await logEvent(db, "submission", "info", `Product submitted: ${data.name}`, { slug, url: data.url, makerName: data.makerName || null }, session.user.id);

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
    makerName: (formData.get("makerName") as string) || undefined,
    makerLink: (formData.get("makerLink") as string) || undefined,
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
      makerName: data.makerName || null,
      makerLink: data.makerLink || null,
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

export async function toggleCommunityInvite(
  userId: string,
  platform: "wechat" | "telegram",
  invited: boolean
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const user = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user[0] || user[0].role !== "admin") {
    return { error: "Not authorized" };
  }

  const field = platform === "wechat" ? { wechatInvited: invited } : { telegramInvited: invited };
  await db.update(users).set(field).where(eq(users.id, userId));
  revalidatePath("/admin");
  return { success: true };
}
