import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// ============ Auth.js tables ============

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  username: text("username"),
  email: text("email"),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  role: text("role").notNull().default("user"),
  bio: text("bio"),
  wechat: text("wechat"),
  showWechat: integer("showWechat", { mode: "boolean" }).notNull().default(false),
  twitterHandle: text("twitterHandle"),
  telegram: text("telegram"),
  showTelegram: integer("showTelegram", { mode: "boolean" }).notNull().default(false),
  wechatInvited: integer("wechatInvited", { mode: "boolean" }).notNull().default(false),
  telegramInvited: integer("telegramInvited", { mode: "boolean" }).notNull().default(false),
});

export const accounts = sqliteTable("accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = sqliteTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable("verificationTokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

// ============ Business tables ============

export const products = sqliteTable("products", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  logoUrl: text("logoUrl"),
  bannerUrl: text("bannerUrl"),
  images: text("images"),
  githubUrl: text("githubUrl"),
  agent: text("agent"),
  llm: text("llm"),
  tags: text("tags"),
  taglineZh: text("taglineZh"),
  taglineEn: text("taglineEn"),
  descriptionZh: text("descriptionZh"),
  descriptionEn: text("descriptionEn"),
  makerName: text("makerName"),
  makerLink: text("makerLink"),
  source: text("source").notNull().default("manual"),
  claimedAt: text("claimedAt"),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  launchDate: text("launchDate").notNull(),
  shitCount: integer("shitCount").notNull().default(0),
  status: text("status").notNull().default("approved"),
  createdAt: text("createdAt")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("products_userId_idx").on(table.userId),
  index("products_launchDate_idx").on(table.launchDate),
  index("products_status_idx").on(table.status),
]);

export const votes = sqliteTable(
  "votes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: text("createdAt")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    uniqueIndex("votes_user_product_idx").on(table.userId, table.productId),
    index("votes_productId_idx").on(table.productId),
  ]
);

export const sotd = sqliteTable("sotd", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  date: text("date").notNull().unique(),
  productId: text("productId")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  voteCount: integer("voteCount").notNull().default(0),
  createdAt: text("createdAt")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const comments = sqliteTable("comments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: text("productId")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  parentCommentId: text("parentCommentId"),
  content: text("content").notNull(),
  createdAt: text("createdAt")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("comments_productId_idx").on(table.productId),
  index("comments_parentCommentId_idx").on(table.parentCommentId),
]);

export const notifications = sqliteTable("notifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "vote" | "comment" | "reply"
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  metadata: text("metadata"),
  createdAt: text("createdAt")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("notifications_userId_idx").on(table.userId),
  index("notifications_userId_read_idx").on(table.userId, table.read),
]);

export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  subscribed: integer("subscribed", { mode: "boolean" }).notNull().default(true),
  token: text("token")
    .notNull()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: text("createdAt")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  unsubscribedAt: text("unsubscribedAt"),
});

export const githubTrendingCache = sqliteTable("github_trending_cache", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  repoFullName: text("repoFullName").notNull().unique(),
  repoUrl: text("repoUrl").notNull(),
  stars: integer("stars").notNull().default(0),
  description: text("description"),
  language: text("language"),
  publishedProductId: text("publishedProductId"),
  status: text("status").notNull().default("pending"),
  aiReason: text("aiReason"),
  fetchedAt: text("fetchedAt")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("gtc_status_idx").on(table.status),
  index("gtc_fetchedAt_idx").on(table.fetchedAt),
]);

export const eventLogs = sqliteTable("event_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  metadata: text("metadata"),
  userId: text("userId"),
  createdAt: text("createdAt")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("event_logs_type_idx").on(table.type),
  index("event_logs_level_idx").on(table.level),
  index("event_logs_createdAt_idx").on(table.createdAt),
]);
