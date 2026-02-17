import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

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
];

const ALTER_STATEMENTS = [
  { check: "role", sql: "ALTER TABLE `users` ADD COLUMN `role` text NOT NULL DEFAULT 'user'" },
  { check: "status", sql: "ALTER TABLE `products` ADD COLUMN `status` text NOT NULL DEFAULT 'approved'" },
  { check: "username", sql: "ALTER TABLE `users` ADD COLUMN `username` text" },
];

export async function GET() {
  try {
    const { env } = await getCloudflareContext({ async: true });

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

    return NextResponse.json({ success: true, message: "Migration completed (v0.0.3)" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
