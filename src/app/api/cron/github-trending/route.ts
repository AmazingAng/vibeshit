import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { products, githubTrendingCache, eventLogs, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { slugify } from "transliteration";
import type { Database } from "@/lib/db";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "MiniMax-M2.5";
const ANTHROPIC_BASE_URL =
  process.env.ANTHROPIC_BASE_URL || "https://api.minimaxi.com/anthropic";
const FALLBACK_MODEL = process.env.AI_REVIEW_MODEL || "claude-sonnet-4-20250514";
const FALLBACK_BASE_URL =
  process.env.AI_REVIEW_BASE_URL || "https://api.skyapi.org";

// System user ID for auto-published products
const SYSTEM_USER_ID = "system-github-trending";

type TrendingRepo = {
  fullName: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  todayStars: number;
};

type RepoContext = {
  fullName: string;
  description: string | null;
  readmeSnippet: string;
  topics: string[];
  homepage: string | null;
  ownerAvatarUrl: string | null;
  socialPreviewUrl: string | null;
};

type AiAnalysis = {
  isVibeProject: boolean;
  name: string;
  tagline: string;
  description: string;
  agent: string;
  llm: string;
  tags: string[];
  reason: string;
};

async function logEvent(
  db: Database,
  type: string,
  level: "info" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>
) {
  try {
    await db.insert(eventLogs).values({
      type,
      level,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      userId: SYSTEM_USER_ID,
    });
  } catch {
    // Never let logging break the main flow
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

const TRENDING_LANGUAGES = [
  "",           // overall trending (no language filter)
  "python",
  "typescript",
  "javascript",
  "rust",
  "go",
  "java",
  "c++",
  "swift",
  "kotlin",
];

/**
 * Scrape a single GitHub Trending page (optionally filtered by language).
 */
async function fetchTrendingPage(language: string): Promise<TrendingRepo[]> {
  const langParam = language ? `/${encodeURIComponent(language)}` : "";
  const url = `https://github.com/trending${langParam}?since=daily`;
  try {
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent": "vibeshit-trending-bot",
          Accept: "text/html",
        },
      },
      15000
    );
    if (res.ok) {
      const html = await res.text();
      return parseTrendingHtml(html);
    }
  } catch {
    // Ignore individual page failures
  }
  return [];
}

/**
 * Scrape GitHub Trending across multiple languages, deduplicate.
 * Falls back to GitHub Search API if scraping fails entirely.
 */
async function fetchTrendingRepos(
  githubToken: string
): Promise<TrendingRepo[]> {
  const seen = new Set<string>();
  const allRepos: TrendingRepo[] = [];

  for (const lang of TRENDING_LANGUAGES) {
    const repos = await fetchTrendingPage(lang);
    for (const repo of repos) {
      if (!seen.has(repo.fullName)) {
        seen.add(repo.fullName);
        allRepos.push(repo);
      }
    }
  }

  if (allRepos.length > 0) return allRepos;

  // Fallback: use GitHub Search API for recently created popular repos
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "vibeshit-trending-bot",
  };
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const dateStr = weekAgo.toISOString().split("T")[0];

  const searchRes = await fetchWithTimeout(
    `https://api.github.com/search/repositories?q=created:>${dateStr}&sort=stars&order=desc&per_page=30`,
    { headers },
    15000
  );

  if (!searchRes.ok) return [];

  const data = (await searchRes.json()) as {
    items?: Array<{
      full_name?: string;
      html_url?: string;
      description?: string;
      language?: string;
      stargazers_count?: number;
    }>;
  };

  return (data.items ?? []).map((item) => ({
    fullName: item.full_name ?? "",
    url: item.html_url ?? "",
    description: item.description ?? "",
    language: item.language ?? "",
    stars: item.stargazers_count ?? 0,
    todayStars: 0,
  }));
}

/**
 * Parse the GitHub Trending HTML to extract repo info.
 */
function parseTrendingHtml(html: string): TrendingRepo[] {
  const repos: TrendingRepo[] = [];
  const repoLinkRegex =
    /<h2[^>]*>\s*<a[^>]*href="\/([^"]+)"[^>]*>/g;

  let match: RegExpExecArray | null;
  const repoNames: string[] = [];

  while ((match = repoLinkRegex.exec(html)) !== null) {
    const fullName = match[1].trim();
    if (fullName.includes("/") && !repoNames.includes(fullName)) {
      repoNames.push(fullName);
    }
  }

  // Extract descriptions and stars for each repo
  for (const fullName of repoNames.slice(0, 30)) {
    // Try to find description near this repo
    const descRegex = new RegExp(
      fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        '[\\s\\S]*?<p[^>]*class="[^"]*col-9[^"]*"[^>]*>\\s*([\\s\\S]*?)\\s*<\\/p>',
      "i"
    );
    const descMatch = descRegex.exec(html);
    const description = descMatch
      ? descMatch[1].replace(/<[^>]*>/g, "").trim()
      : "";

    // Try to find star count
    const starsRegex = new RegExp(
      fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        '[\\s\\S]*?class="[^"]*d-inline-block float-sm-right[^"]*"[^>]*>[\\s]*([\\d,]+)',
      "i"
    );
    const starsMatch = starsRegex.exec(html);
    const todayStars = starsMatch
      ? parseInt(starsMatch[1].replace(/,/g, ""), 10) || 0
      : 0;

    repos.push({
      fullName,
      url: `https://github.com/${fullName}`,
      description,
      language: "",
      stars: 0,
      todayStars,
    });
  }

  return repos;
}

/**
 * Fetch detailed repo context from GitHub API.
 */
async function fetchRepoContext(
  fullName: string,
  githubToken: string
): Promise<RepoContext | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "vibeshit-trending-bot",
  };
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const repoRes = await fetchWithTimeout(
    `https://api.github.com/repos/${fullName}`,
    { headers },
    8000
  );
  if (!repoRes.ok) return null;

  const repo = (await repoRes.json()) as {
    description?: string | null;
    stargazers_count?: number;
    language?: string | null;
    topics?: string[];
    homepage?: string | null;
    default_branch?: string;
    owner?: { avatar_url?: string };
  };

  // Fetch README
  let readmeSnippet = "";
  try {
    const readmeRes = await fetchWithTimeout(
      `https://raw.githubusercontent.com/${fullName}/${repo.default_branch ?? "main"}/README.md`,
      { headers },
      8000
    );
    if (readmeRes.ok) {
      const readme = await readmeRes.text();
      readmeSnippet = readme.slice(0, 3000);
    }
  } catch {
    // Ignore
  }

  // Try to get social preview image
  let socialPreviewUrl: string | null = null;
  try {
    const socialRes = await fetchWithTimeout(
      `https://opengraph.githubassets.com/1/${fullName}`,
      { method: "HEAD", redirect: "follow" },
      5000
    );
    if (socialRes.ok) {
      socialPreviewUrl = `https://opengraph.githubassets.com/1/${fullName}`;
    }
  } catch {
    // Ignore
  }

  return {
    fullName,
    description: repo.description ?? null,
    readmeSnippet,
    topics: repo.topics ?? [],
    homepage: repo.homepage ?? null,
    ownerAvatarUrl: repo.owner?.avatar_url ?? null,
    socialPreviewUrl,
  };
}

/**
 * Use AI to determine if a repo is a "vibe coding" project and generate product info.
 */
async function analyzeWithAi(
  repo: TrendingRepo,
  context: RepoContext,
  anthropicApiKey: string,
  openaiApiKey: string
): Promise<AiAnalysis | null> {
  const prompt = [
    "You are analyzing a GitHub repository to determine if it's relevant to the 'vibe coding' community.",
    "'Vibe coding' means projects built with AI assistance — using AI coding agents (Cursor, Windsurf, Claude Code, GitHub Copilot, v0, bolt, Lovable, etc.), ",
    "LLMs, or AI-powered developer tools. Also include AI tools, AI apps, LLM wrappers, AI agents, and creative projects built with AI.",
    "",
    "Analyze this repo and respond with strict JSON:",
    "{",
    '  "isVibeProject": boolean,  // true if this is a vibe coding / AI-related project',
    '  "name": string,            // a catchy product name (use repo name or improve it)',
    '  "tagline": string,         // one-liner tagline, max 120 chars',
    '  "description": string,     // 1-3 sentence description for the community, max 500 chars',
    '  "agent": string,           // max 2 AI agents/tools, comma-separated (e.g. "Cursor", "Cursor, Claude Code"). Use "Unknown" if unclear',
    '  "llm": string,             // max 2 LLMs, comma-separated (e.g. "GPT-4", "Claude 3.5, GPT-4"). Use "Unknown" if unclear',
    '  "tags": string[],          // 1-5 relevant tags',
    '  "reason": string           // brief explanation of why this is/isn\'t a vibe project',
    "}",
    "",
    `Repo: ${repo.fullName}`,
    `URL: ${repo.url}`,
    `Description: ${repo.description || context.description || "N/A"}`,
    `Stars: ${repo.stars}`,
    `Language: ${repo.language || "N/A"}`,
    `Topics: ${context.topics.join(", ") || "N/A"}`,
    `Homepage: ${context.homepage || "N/A"}`,
    "",
    "README (first 3000 chars):",
    context.readmeSnippet || "No README available.",
  ].join("\n");

  const systemPrompt =
    "You are an expert at identifying AI-assisted and vibe coding projects. Be moderately inclusive — if a project is AI-related, built with AI tools, or serves the AI developer community, mark it as a vibe project. Return JSON only.";

  // Try primary AI provider
  if (anthropicApiKey) {
    try {
      const res = await fetchWithTimeout(
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
            system: systemPrompt,
            messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
          }),
        },
        30000
      );

      if (res.ok) {
        const json = (await res.json()) as {
          content?: Array<{ type?: string; text?: string; thinking?: string }>;
        };
        const allText = (json.content ?? [])
          .map((part) => {
            if (part.type === "text" && typeof part.text === "string")
              return part.text;
            if (part.type === "thinking" && typeof part.thinking === "string")
              return part.thinking;
            return "";
          })
          .filter(Boolean)
          .join("\n");

        const jsonStr = extractJsonObject(allText);
        if (jsonStr) {
          return JSON.parse(jsonStr) as AiAnalysis;
        }
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback AI provider
  if (openaiApiKey) {
    try {
      const res = await fetchWithTimeout(
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
            system: systemPrompt,
            messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
          }),
        },
        30000
      );

      if (res.ok) {
        const json = (await res.json()) as {
          content?: Array<{ type?: string; text?: string }>;
        };
        const allText = (json.content ?? [])
          .filter((p) => p.type === "text" && typeof p.text === "string")
          .map((p) => p.text ?? "")
          .join("\n");

        const jsonStr = extractJsonObject(allText);
        if (jsonStr) {
          return JSON.parse(jsonStr) as AiAnalysis;
        }
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function makeSlug(text: string): string {
  const slug = slugify(text, {
    lowercase: true,
    separator: "-",
    allowedChars: "a-zA-Z0-9",
  }).slice(0, 60);
  return slug || `project-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Ensure the system user exists for auto-published products.
 */
async function ensureSystemUser(db: Database): Promise<void> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, SYSTEM_USER_ID))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(users).values({
      id: SYSTEM_USER_ID,
      name: "GitHub Trending Bot",
      username: "github-trending-bot",
      email: "bot@vibeshit.org",
      role: "user",
    });
  }
}

/**
 * Publish a trending repo as a product on vibeshit.
 */
async function publishProduct(
  db: Database,
  repo: TrendingRepo,
  context: RepoContext,
  analysis: AiAnalysis
): Promise<string | null> {
  // Check for duplicate by githubUrl
  const existing = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.githubUrl, repo.url),
  });
  if (existing) return null;

  let slug = makeSlug(analysis.name);

  const slugExists = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });
  if (slugExists) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const today = new Date().toISOString().split("T")[0];
  const projectUrl = context.homepage || repo.url;
  const logoUrl = context.ownerAvatarUrl || null;
  const bannerUrl = context.socialPreviewUrl || null;

  // Limit agent and llm to at most 2 entries
  const trimList = (s: string) =>
    s.split(/,\s*/).filter(Boolean).slice(0, 2).join(", ");
  const agent = analysis.agent ? trimList(analysis.agent) : analysis.agent;
  const llm = analysis.llm ? trimList(analysis.llm) : analysis.llm;

  const result = await db
    .insert(products)
    .values({
      name: analysis.name,
      slug,
      tagline: analysis.tagline,
      description: analysis.description,
      url: projectUrl,
      logoUrl,
      bannerUrl,
      images: bannerUrl ? JSON.stringify([bannerUrl]) : null,
      githubUrl: repo.url,
      agent,
      llm,
      tags:
        analysis.tags.length > 0 ? JSON.stringify(analysis.tags) : null,
      source: "github-trending",
      userId: SYSTEM_USER_ID,
      launchDate: today,
      status: "approved",
    })
    .returning({ id: products.id });

  return result[0]?.id ?? null;
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const { env } = await getCloudflareContext({ async: true });
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const expected = runtimeEnv.MIGRATE_SECRET ?? process.env.MIGRATE_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb(env.DB);
  const githubToken = String(
    runtimeEnv.GITHUB_TOKEN || process.env.GITHUB_TOKEN || ""
  );
  const anthropicApiKey = String(
    runtimeEnv.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || ""
  );
  const openaiApiKey = String(
    runtimeEnv.AI_REVIEW_API_KEY || process.env.AI_REVIEW_API_KEY || ""
  );

  const maxRepos = parseInt(
    request.nextUrl.searchParams.get("limit") ?? "10",
    10
  );
  const maxPublish = parseInt(
    request.nextUrl.searchParams.get("maxPublish") ?? "3",
    10
  );

  try {
    await ensureSystemUser(db);

    await logEvent(db, "github_trending", "info", "Starting GitHub trending fetch");

    // Phase 1: Fetch trending repos
    const trendingRepos = await fetchTrendingRepos(githubToken);
    await logEvent(db, "github_trending", "info", `Fetched ${trendingRepos.length} trending repos`);

    let published = 0;
    let skipped = 0;
    let rejected = 0;
    const results: Array<{
      repo: string;
      status: string;
      reason?: string;
    }> = [];

    for (const repo of trendingRepos.slice(0, maxRepos)) {
      // Stop scanning if we've published enough this run
      if (published >= maxPublish) break;

      // Skip if already in cache
      const cached = await db
        .select({ id: githubTrendingCache.id })
        .from(githubTrendingCache)
        .where(eq(githubTrendingCache.repoFullName, repo.fullName))
        .limit(1);

      if (cached.length > 0) {
        skipped++;
        results.push({ repo: repo.fullName, status: "cached" });
        continue;
      }

      // Also skip if already published as a product
      const existingProduct = await db.query.products.findFirst({
        where: (p, { eq }) => eq(p.githubUrl, repo.url),
      });
      if (existingProduct) {
        // Add to cache as already published
        await db.insert(githubTrendingCache).values({
          repoFullName: repo.fullName,
          repoUrl: repo.url,
          stars: repo.stars,
          description: repo.description,
          language: repo.language,
          status: "already_exists",
          publishedProductId: existingProduct.id,
        });
        skipped++;
        results.push({ repo: repo.fullName, status: "already_exists" });
        continue;
      }

      // Phase 2: Fetch repo context
      const context = await fetchRepoContext(repo.fullName, githubToken);
      if (!context) {
        await db.insert(githubTrendingCache).values({
          repoFullName: repo.fullName,
          repoUrl: repo.url,
          stars: repo.stars,
          description: repo.description,
          language: repo.language,
          status: "fetch_failed",
        });
        results.push({ repo: repo.fullName, status: "fetch_failed" });
        continue;
      }

      // Update stars from API
      if (repo.stars === 0) {
        // Try to get from API response (already fetched in context)
        // Re-fetch for star count
        try {
          const repoRes = await fetchWithTimeout(
            `https://api.github.com/repos/${repo.fullName}`,
            {
              headers: {
                Accept: "application/vnd.github+json",
                "User-Agent": "vibeshit-trending-bot",
                ...(githubToken
                  ? { Authorization: `Bearer ${githubToken}` }
                  : {}),
              },
            },
            5000
          );
          if (repoRes.ok) {
            const repoData = (await repoRes.json()) as {
              stargazers_count?: number;
            };
            repo.stars = repoData.stargazers_count ?? 0;
          }
        } catch {
          // Ignore
        }
      }

      // Phase 2: AI analysis
      const analysis = await analyzeWithAi(
        repo,
        context,
        anthropicApiKey,
        openaiApiKey
      );

      if (!analysis) {
        await db.insert(githubTrendingCache).values({
          repoFullName: repo.fullName,
          repoUrl: repo.url,
          stars: repo.stars,
          description: repo.description,
          language: repo.language,
          status: "ai_failed",
        });
        results.push({ repo: repo.fullName, status: "ai_failed" });
        continue;
      }

      if (!analysis.isVibeProject) {
        await db.insert(githubTrendingCache).values({
          repoFullName: repo.fullName,
          repoUrl: repo.url,
          stars: repo.stars,
          description: repo.description,
          language: repo.language,
          status: "rejected",
          aiReason: analysis.reason,
        });
        rejected++;
        results.push({
          repo: repo.fullName,
          status: "rejected",
          reason: analysis.reason,
        });
        continue;
      }

      // Phase 3: Publish to vibeshit
      const productId = await publishProduct(db, repo, context, analysis);

      await db.insert(githubTrendingCache).values({
        repoFullName: repo.fullName,
        repoUrl: repo.url,
        stars: repo.stars,
        description: repo.description,
        language: repo.language,
        status: productId ? "published" : "duplicate",
        publishedProductId: productId,
        aiReason: analysis.reason,
      });

      if (productId) {
        published++;
        results.push({ repo: repo.fullName, status: "published" });

        // Tweet about it (fire-and-forget)
        const xapiKey = String(
          (env as unknown as Record<string, unknown>).XAPI_API_KEY || ""
        );
        if (xapiKey) {
          const product = await db.query.products.findFirst({
            where: (p, { eq }) => eq(p.id, productId),
          });
          if (product) {
            const productUrl = `https://vibeshit.org/product/${product.slug}`;
            const starsStr = repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(repo.stars);
            const metaParts: string[] = [];
            if (analysis.agent && analysis.agent !== "Unknown") metaParts.push(`🤖 ${analysis.agent}`);
            if (analysis.llm && analysis.llm !== "Unknown") metaParts.push(`🧠 ${analysis.llm}`);
            const metaLine = metaParts.length > 0 ? `${metaParts.join(" · ")}\n` : "";
            const tweetText = `🔥 on GitHub\n${analysis.name}\n${analysis.tagline}\n\n⭐ ${starsStr} stars on GitHub\n${metaLine}\n${productUrl}`;
            try {
              await fetchWithTimeout(
                "https://action.xapi.to/v1/actions/execute",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "XAPI-Key": xapiKey,
                  },
                  body: JSON.stringify({
                    action_id: "x-official.2_tweets",
                    input: { method: "POST", body: { text: tweetText } },
                  }),
                },
                15000
              );
            } catch {
              // Ignore tweet failures
            }
          }
        }

        await logEvent(
          db,
          "github_trending",
          "info",
          `Published: ${repo.fullName} as "${analysis.name}"`,
          { productId, stars: repo.stars, slug: analysis.name }
        );
      } else {
        results.push({ repo: repo.fullName, status: "duplicate" });
      }
    }

    const summary = `Done: ${published} published, ${rejected} rejected, ${skipped} skipped`;
    await logEvent(db, "github_trending", "info", summary, {
      published,
      rejected,
      skipped,
      total: trendingRepos.length,
    });

    return NextResponse.json({
      success: true,
      summary,
      published,
      rejected,
      skipped,
      results,
    });
  } catch (error) {
    await logEvent(
      db,
      "github_trending",
      "error",
      `Cron failed: ${String(error)}`
    );
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
