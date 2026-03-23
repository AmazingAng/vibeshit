import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";

const MIGRATIONS = [
  // v0.0.1 - Initial schema
  `CREATE TABLE IF NOT EXISTS \`users\` (\`id\` text PRIMARY KEY NOT NULL, \`name\` text, \`email\` text, \`emailVerified\` integer, \`image\` text)`,
  `CREATE TABLE IF NOT EXISTS \`accounts\` (\`id\` text PRIMARY KEY NOT NULL, \`userId\` text NOT NULL, \`type\` text NOT NULL, \`provider\` text NOT NULL, \`providerAccountId\` text NOT NULL, \`refresh_token\` text, \`access_token\` text, \`expires_at\` integer, \`token_type\` text, \`scope\` text, \`id_token\` text, \`session_state\` text, FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS \`sessions\` (\`sessionToken\` text PRIMARY KEY NOT NULL, \`userId\` text NOT NULL, \`expires\` integer NOT NULL, FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS \`verificationTokens\` (\`identifier\` text NOT NULL, \`token\` text NOT NULL, \`expires\` integer NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS \`products\` (\`id\` text PRIMARY KEY NOT NULL, \`name\` text NOT NULL, \`slug\` text NOT NULL, \`tagline\` text NOT NULL, \`description\` text, \`url\` text NOT NULL, \`logoUrl\` text, \`githubUrl\` text, \`userId\` text NOT NULL, \`launchDate\` text NOT NULL, \`shitCount\` integer DEFAULT 0 NOT NULL, \`createdAt\` text NOT NULL, FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`products_slug_unique\` ON \`products\` (\`slug\`)`,
  `CREATE TABLE IF NOT EXISTS \`votes\` (\`id\` text PRIMARY KEY NOT NULL, \`userId\` text NOT NULL, \`productId\` text NOT NULL, \`createdAt\` text NOT NULL, FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE, FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`votes_user_product_idx\` ON \`votes\` (\`userId\`,\`productId\`)`,
  // v0.0.2 - Comments, status, role
  `CREATE TABLE IF NOT EXISTS \`comments\` (\`id\` text PRIMARY KEY NOT NULL, \`userId\` text NOT NULL, \`productId\` text NOT NULL, \`content\` text NOT NULL, \`createdAt\` text NOT NULL, FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE, FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE)`,
  // v0.0.3 - SOTD (Shit of the Day)
  `CREATE TABLE IF NOT EXISTS \`sotd\` (\`id\` text PRIMARY KEY NOT NULL, \`date\` text NOT NULL, \`productId\` text NOT NULL, \`voteCount\` integer DEFAULT 0 NOT NULL, \`createdAt\` text NOT NULL, FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`sotd_date_unique\` ON \`sotd\` (\`date\`)`,
  // v0.0.7 - Performance indexes
  `CREATE INDEX IF NOT EXISTS \`products_userId_idx\` ON \`products\` (\`userId\`)`,
  `CREATE INDEX IF NOT EXISTS \`products_launchDate_idx\` ON \`products\` (\`launchDate\`)`,
  `CREATE INDEX IF NOT EXISTS \`products_status_idx\` ON \`products\` (\`status\`)`,
  `CREATE INDEX IF NOT EXISTS \`votes_productId_idx\` ON \`votes\` (\`productId\`)`,
  `CREATE INDEX IF NOT EXISTS \`comments_productId_idx\` ON \`comments\` (\`productId\`)`,
];

const ALTER_STATEMENTS = [
  { check: "role", sql: "ALTER TABLE `users` ADD COLUMN `role` text NOT NULL DEFAULT 'user'" },
  { check: "status", sql: "ALTER TABLE `products` ADD COLUMN `status` text NOT NULL DEFAULT 'approved'" },
  { check: "username", sql: "ALTER TABLE `users` ADD COLUMN `username` text" },
  { check: "bannerUrl", sql: "ALTER TABLE `products` ADD COLUMN `bannerUrl` text" },
  { check: "agent", sql: "ALTER TABLE `products` ADD COLUMN `agent` text" },
  { check: "llm", sql: "ALTER TABLE `products` ADD COLUMN `llm` text" },
  { check: "tags", sql: "ALTER TABLE `products` ADD COLUMN `tags` text" },
  { check: "images", sql: "ALTER TABLE `products` ADD COLUMN `images` text" },
  // v0.0.5 - User social profiles
  { check: "bio", sql: "ALTER TABLE `users` ADD COLUMN `bio` text" },
  { check: "wechat", sql: "ALTER TABLE `users` ADD COLUMN `wechat` text" },
  { check: "twitterHandle", sql: "ALTER TABLE `users` ADD COLUMN `twitterHandle` text" },
  { check: "telegram", sql: "ALTER TABLE `users` ADD COLUMN `telegram` text" },
  { check: "showWechat", sql: "ALTER TABLE `users` ADD COLUMN `showWechat` integer NOT NULL DEFAULT 0" },
  { check: "showTelegram", sql: "ALTER TABLE `users` ADD COLUMN `showTelegram` integer NOT NULL DEFAULT 0" },
  // v0.0.6 - Community invite tracking
  { check: "wechatInvited", sql: "ALTER TABLE `users` ADD COLUMN `wechatInvited` integer NOT NULL DEFAULT 0" },
  { check: "telegramInvited", sql: "ALTER TABLE `users` ADD COLUMN `telegramInvited` integer NOT NULL DEFAULT 0" },
  // v0.0.8 - Maker attribution (share others' projects)
  { check: "makerName", sql: "ALTER TABLE `products` ADD COLUMN `makerName` text" },
  { check: "makerLink", sql: "ALTER TABLE `products` ADD COLUMN `makerLink` text" },
  // v0.1.0 - Source tracking for auto-discovered products
  { check: "source", sql: "ALTER TABLE `products` ADD COLUMN `source` text NOT NULL DEFAULT 'manual'" },
  // v0.2.0 - Nested comments
  { check: "parentCommentId", sql: "ALTER TABLE `comments` ADD COLUMN `parentCommentId` text" },
  // v0.2.0 - Maker claim
  { check: "claimedAt", sql: "ALTER TABLE `products` ADD COLUMN `claimedAt` text" },
  // v0.3.0 - Bilingual tagline/description
  { check: "taglineZh", sql: "ALTER TABLE `products` ADD COLUMN `taglineZh` text" },
  { check: "taglineEn", sql: "ALTER TABLE `products` ADD COLUMN `taglineEn` text" },
  { check: "descriptionZh", sql: "ALTER TABLE `products` ADD COLUMN `descriptionZh` text" },
  { check: "descriptionEn", sql: "ALTER TABLE `products` ADD COLUMN `descriptionEn` text" },
];

const EXTRA_MIGRATIONS = [
  // v0.0.9 - Event logs for admin dashboard
  `CREATE TABLE IF NOT EXISTS \`event_logs\` (\`id\` text PRIMARY KEY NOT NULL, \`type\` text NOT NULL, \`level\` text NOT NULL DEFAULT 'info', \`message\` text NOT NULL, \`metadata\` text, \`userId\` text, \`createdAt\` text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS \`event_logs_type_idx\` ON \`event_logs\` (\`type\`)`,
  `CREATE INDEX IF NOT EXISTS \`event_logs_level_idx\` ON \`event_logs\` (\`level\`)`,
  `CREATE INDEX IF NOT EXISTS \`event_logs_createdAt_idx\` ON \`event_logs\` (\`createdAt\`)`,
  // v0.1.0 - GitHub trending cache
  `CREATE TABLE IF NOT EXISTS \`github_trending_cache\` (\`id\` text PRIMARY KEY NOT NULL, \`repoFullName\` text NOT NULL, \`repoUrl\` text NOT NULL, \`stars\` integer DEFAULT 0 NOT NULL, \`description\` text, \`language\` text, \`publishedProductId\` text, \`status\` text NOT NULL DEFAULT 'pending', \`aiReason\` text, \`fetchedAt\` text NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`gtc_repoFullName_unique\` ON \`github_trending_cache\` (\`repoFullName\`)`,
  `CREATE INDEX IF NOT EXISTS \`gtc_status_idx\` ON \`github_trending_cache\` (\`status\`)`,
  `CREATE INDEX IF NOT EXISTS \`gtc_fetchedAt_idx\` ON \`github_trending_cache\` (\`fetchedAt\`)`,
  // v0.2.0 - Nested comments index
  `CREATE INDEX IF NOT EXISTS \`comments_parentCommentId_idx\` ON \`comments\` (\`parentCommentId\`)`,
  // v0.2.0 - Notifications
  `CREATE TABLE IF NOT EXISTS \`notifications\` (\`id\` text PRIMARY KEY NOT NULL, \`userId\` text NOT NULL, \`type\` text NOT NULL, \`title\` text NOT NULL, \`message\` text NOT NULL, \`link\` text, \`read\` integer NOT NULL DEFAULT 0, \`metadata\` text, \`createdAt\` text NOT NULL, FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS \`notifications_userId_idx\` ON \`notifications\` (\`userId\`)`,
  `CREATE INDEX IF NOT EXISTS \`notifications_userId_read_idx\` ON \`notifications\` (\`userId\`, \`read\`)`,
  // v0.2.0 - Newsletter subscribers
  `CREATE TABLE IF NOT EXISTS \`newsletter_subscribers\` (\`id\` text PRIMARY KEY NOT NULL, \`email\` text NOT NULL, \`subscribed\` integer NOT NULL DEFAULT 1, \`token\` text NOT NULL, \`createdAt\` text NOT NULL, \`unsubscribedAt\` text)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`newsletter_subscribers_email_unique\` ON \`newsletter_subscribers\` (\`email\`)`,
];

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const { env } = await getCloudflareContext({ async: true });
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const expected = runtimeEnv.MIGRATE_SECRET ?? process.env.MIGRATE_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    for (const statement of MIGRATIONS) {
      await env.DB.prepare(statement).run();
    }

    for (const alter of ALTER_STATEMENTS) {
      try {
        await env.DB.prepare(alter.sql).run();
      } catch {
        // Column likely already exists
      }
    }

    for (const stmt of EXTRA_MIGRATIONS) {
      await env.DB.prepare(stmt).run();
    }

    return NextResponse.json({ success: true, message: "Migration completed (v0.3.0)" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
