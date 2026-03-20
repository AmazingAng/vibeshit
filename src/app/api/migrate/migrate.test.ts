import { describe, it, expect } from "vitest";

/**
 * Tests to verify migration statements are well-formed SQL.
 * We replicate the arrays from route.ts and validate their structure.
 */

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS \`users\` (\`id\` text PRIMARY KEY NOT NULL, \`name\` text, \`email\` text, \`emailVerified\` integer, \`image\` text)`,
  `CREATE TABLE IF NOT EXISTS \`accounts\` (\`id\` text PRIMARY KEY NOT NULL, \`userId\` text NOT NULL, \`type\` text NOT NULL, \`provider\` text NOT NULL, \`providerAccountId\` text NOT NULL, \`refresh_token\` text, \`access_token\` text, \`expires_at\` integer, \`token_type\` text, \`scope\` text, \`id_token\` text, \`session_state\` text, FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS \`sessions\` (\`sessionToken\` text PRIMARY KEY NOT NULL, \`userId\` text NOT NULL, \`expires\` integer NOT NULL, FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS \`verificationTokens\` (\`identifier\` text NOT NULL, \`token\` text NOT NULL, \`expires\` integer NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS \`products\` (\`id\` text PRIMARY KEY NOT NULL, \`name\` text NOT NULL, \`slug\` text NOT NULL, \`tagline\` text NOT NULL, \`description\` text, \`url\` text NOT NULL, \`logoUrl\` text, \`githubUrl\` text, \`userId\` text NOT NULL, \`launchDate\` text NOT NULL, \`shitCount\` integer DEFAULT 0 NOT NULL, \`createdAt\` text NOT NULL, FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`products_slug_unique\` ON \`products\` (\`slug\`)`,
  `CREATE TABLE IF NOT EXISTS \`votes\` (\`id\` text PRIMARY KEY NOT NULL, \`userId\` text NOT NULL, \`productId\` text NOT NULL, \`createdAt\` text NOT NULL, FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE, FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`votes_user_product_idx\` ON \`votes\` (\`userId\`,\`productId\`)`,
  `CREATE TABLE IF NOT EXISTS \`comments\` (\`id\` text PRIMARY KEY NOT NULL, \`userId\` text NOT NULL, \`productId\` text NOT NULL, \`content\` text NOT NULL, \`createdAt\` text NOT NULL, FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE, FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS \`sotd\` (\`id\` text PRIMARY KEY NOT NULL, \`date\` text NOT NULL, \`productId\` text NOT NULL, \`voteCount\` integer DEFAULT 0 NOT NULL, \`createdAt\` text NOT NULL, FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`sotd_date_unique\` ON \`sotd\` (\`date\`)`,
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
  { check: "bio", sql: "ALTER TABLE `users` ADD COLUMN `bio` text" },
  { check: "wechat", sql: "ALTER TABLE `users` ADD COLUMN `wechat` text" },
  { check: "twitterHandle", sql: "ALTER TABLE `users` ADD COLUMN `twitterHandle` text" },
  { check: "telegram", sql: "ALTER TABLE `users` ADD COLUMN `telegram` text" },
  { check: "showWechat", sql: "ALTER TABLE `users` ADD COLUMN `showWechat` integer NOT NULL DEFAULT 0" },
  { check: "showTelegram", sql: "ALTER TABLE `users` ADD COLUMN `showTelegram` integer NOT NULL DEFAULT 0" },
  { check: "wechatInvited", sql: "ALTER TABLE `users` ADD COLUMN `wechatInvited` integer NOT NULL DEFAULT 0" },
  { check: "telegramInvited", sql: "ALTER TABLE `users` ADD COLUMN `telegramInvited` integer NOT NULL DEFAULT 0" },
  { check: "makerName", sql: "ALTER TABLE `products` ADD COLUMN `makerName` text" },
  { check: "makerLink", sql: "ALTER TABLE `products` ADD COLUMN `makerLink` text" },
  { check: "source", sql: "ALTER TABLE `products` ADD COLUMN `source` text NOT NULL DEFAULT 'manual'" },
];

describe("migration statements", () => {
  it("all CREATE statements use IF NOT EXISTS", () => {
    for (const stmt of MIGRATIONS) {
      if (stmt.startsWith("CREATE")) {
        expect(stmt).toContain("IF NOT EXISTS");
      }
    }
  });

  it("all CREATE TABLE statements (except verificationTokens) define a PRIMARY KEY", () => {
    for (const stmt of MIGRATIONS) {
      if (stmt.startsWith("CREATE TABLE") && !stmt.includes("verificationTokens")) {
        expect(stmt).toContain("PRIMARY KEY");
      }
    }
  });

  it("all ALTER statements have valid structure", () => {
    for (const alter of ALTER_STATEMENTS) {
      expect(alter.check).toBeTruthy();
      expect(alter.sql).toContain("ALTER TABLE");
      expect(alter.sql).toContain("ADD COLUMN");
      expect(alter.sql).toContain(alter.check);
    }
  });

  it("ALTER statements reference valid tables", () => {
    const validTables = ["`users`", "`products`"];
    for (const alter of ALTER_STATEMENTS) {
      const tableMatch = alter.sql.match(/ALTER TABLE (\S+)/);
      expect(tableMatch).not.toBeNull();
      expect(validTables).toContain(tableMatch![1]);
    }
  });

  it("has no duplicate check names in ALTER statements", () => {
    const checks = ALTER_STATEMENTS.map((a) => a.check);
    const uniqueChecks = new Set(checks);
    expect(uniqueChecks.size).toBe(checks.length);
  });

  it("creates all required tables", () => {
    const tableNames = MIGRATIONS
      .filter((s) => s.startsWith("CREATE TABLE"))
      .map((s) => {
        const match = s.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    expect(tableNames).toContain("users");
    expect(tableNames).toContain("accounts");
    expect(tableNames).toContain("sessions");
    expect(tableNames).toContain("products");
    expect(tableNames).toContain("votes");
    expect(tableNames).toContain("comments");
    expect(tableNames).toContain("sotd");
  });

  it("source column defaults to manual", () => {
    const sourceAlter = ALTER_STATEMENTS.find((a) => a.check === "source");
    expect(sourceAlter).toBeDefined();
    expect(sourceAlter!.sql).toContain("DEFAULT 'manual'");
  });

  it("foreign keys reference users table with CASCADE", () => {
    const fkStatements = MIGRATIONS.filter(
      (s) => s.includes("FOREIGN KEY") && s.includes("REFERENCES `users`")
    );
    for (const stmt of fkStatements) {
      expect(stmt).toContain("ON DELETE CASCADE");
    }
  });
});
