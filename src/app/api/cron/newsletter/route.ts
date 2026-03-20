import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { products, users, eventLogs } from "@/lib/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import type { Database } from "@/lib/db";

const XAPI_ACTION_HOST = "https://action.xapi.to";

async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function postTweetAndGetId(
  xapiKey: string,
  text: string,
  replyToId?: string
): Promise<string | null> {
  const body: Record<string, unknown> = { text };
  if (replyToId) {
    body.reply = { in_reply_to_tweet_id: replyToId };
  }

  const res = await fetchWithTimeout(
    `${XAPI_ACTION_HOST}/v1/actions/execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "XAPI-Key": xapiKey,
      },
      body: JSON.stringify({
        action_id: "x-official.2_tweets",
        input: { method: "POST", body },
      }),
    },
    15000
  );

  if (!res.ok) return null;

  try {
    const json = await res.json() as { output?: { data?: { id?: string } } };
    return json?.output?.data?.id ?? null;
  } catch {
    return null;
  }
}

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
    });
  } catch {
    // Never let logging break the main flow
  }
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const { env } = await getCloudflareContext({ async: true });
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const expected = runtimeEnv.MIGRATE_SECRET ?? process.env.MIGRATE_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const xapiKey = String(runtimeEnv.XAPI_API_KEY || "");
  if (!xapiKey) {
    return NextResponse.json({ error: "XAPI_API_KEY not configured" }, { status: 500 });
  }

  const db = getDb(env.DB);

  // Get top 3 products from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split("T")[0];

  const topProducts = await db
    .select({
      name: products.name,
      slug: products.slug,
      tagline: products.tagline,
      shitCount: products.shitCount,
      agent: products.agent,
      llm: products.llm,
      userName: users.name,
      userUsername: users.username,
    })
    .from(products)
    .leftJoin(users, eq(products.userId, users.id))
    .where(and(eq(products.status, "approved"), gte(products.launchDate, cutoff)))
    .orderBy(desc(products.shitCount))
    .limit(3);

  if (topProducts.length === 0) {
    return NextResponse.json({ success: true, message: "No products this week" });
  }

  // Build thread: first tweet is the header, then one tweet per product
  const weekLabel = `${cutoff} ~ ${new Date().toISOString().split("T")[0]}`;
  const headerText = `💩 Weekly Vibe Shit Digest (${weekLabel})\n\nTop ${topProducts.length} most shitted projects this week 🧵👇`;

  // Post header tweet
  const headerId = await postTweetAndGetId(xapiKey, headerText);
  if (!headerId) {
    await logEvent(db, "weekly-digest", "error", "Failed to post header tweet");
    return NextResponse.json({ error: "Failed to post header tweet" }, { status: 500 });
  }

  await logEvent(db, "weekly-digest", "info", `Header tweet posted: ${headerId}`);

  let lastTweetId = headerId;
  const posted: string[] = [headerId];

  for (let i = 0; i < topProducts.length; i++) {
    const p = topProducts[i];
    const rank = ["🥇", "🥈", "🥉"][i];
    const productUrl = `https://vibeshit.org/product/${p.slug}`;
    const metaParts: string[] = [];
    if (p.agent) metaParts.push(`🤖 ${p.agent}`);
    if (p.llm) metaParts.push(`🧠 ${p.llm}`);
    const metaLine = metaParts.length > 0 ? `\n${metaParts.join(" · ")}` : "";
    const byLine = p.userUsername ? `\nby @${p.userUsername}` : "";

    const tweetText = `${rank} ${p.name} — ${p.shitCount} 💩\n${p.tagline}${metaLine}${byLine}\n\n${productUrl}`;

    const tweetId = await postTweetAndGetId(xapiKey, tweetText, lastTweetId);
    if (tweetId) {
      lastTweetId = tweetId;
      posted.push(tweetId);
    } else {
      await logEvent(db, "weekly-digest", "warn", `Failed to post tweet for ${p.name}`);
    }
  }

  await logEvent(db, "weekly-digest", "info", `Weekly digest thread posted: ${posted.length} tweets`, { tweetIds: posted });

  return NextResponse.json({ success: true, posted: posted.length, tweetIds: posted });
}
