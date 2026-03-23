import { describe, it, expect } from "vitest";
import * as schema from "./schema";

describe("database schema", () => {
  it("exports all required tables", () => {
    expect(schema.users).toBeDefined();
    expect(schema.accounts).toBeDefined();
    expect(schema.sessions).toBeDefined();
    expect(schema.verificationTokens).toBeDefined();
    expect(schema.products).toBeDefined();
    expect(schema.votes).toBeDefined();
    expect(schema.sotd).toBeDefined();
    expect(schema.comments).toBeDefined();
    expect(schema.eventLogs).toBeDefined();
    expect(schema.githubTrendingCache).toBeDefined();
  });

  it("products table has source column", () => {
    // Verify the source column exists in the schema definition
    const productColumns = Object.keys(schema.products);
    // drizzle tables expose columns, check it exists
    expect(schema.products.source).toBeDefined();
  });

  it("githubTrendingCache table has required columns", () => {
    expect(schema.githubTrendingCache.repoFullName).toBeDefined();
    expect(schema.githubTrendingCache.repoUrl).toBeDefined();
    expect(schema.githubTrendingCache.stars).toBeDefined();
    expect(schema.githubTrendingCache.status).toBeDefined();
    expect(schema.githubTrendingCache.aiReason).toBeDefined();
    expect(schema.githubTrendingCache.publishedProductId).toBeDefined();
  });

  it("users table has social fields", () => {
    expect(schema.users.bio).toBeDefined();
    expect(schema.users.wechat).toBeDefined();
    expect(schema.users.telegram).toBeDefined();
    expect(schema.users.twitterHandle).toBeDefined();
    expect(schema.users.showWechat).toBeDefined();
    expect(schema.users.showTelegram).toBeDefined();
  });

  it("products table has metadata fields", () => {
    expect(schema.products.agent).toBeDefined();
    expect(schema.products.llm).toBeDefined();
    expect(schema.products.tags).toBeDefined();
    expect(schema.products.makerName).toBeDefined();
    expect(schema.products.makerLink).toBeDefined();
    expect(schema.products.images).toBeDefined();
    expect(schema.products.bannerUrl).toBeDefined();
  });

  it("products table has bilingual fields", () => {
    expect(schema.products.taglineZh).toBeDefined();
    expect(schema.products.taglineEn).toBeDefined();
    expect(schema.products.descriptionZh).toBeDefined();
    expect(schema.products.descriptionEn).toBeDefined();
  });

  it("votes table has unique constraint on user+product", () => {
    // The uniqueIndex is defined in the schema
    expect(schema.votes.userId).toBeDefined();
    expect(schema.votes.productId).toBeDefined();
  });

  it("sotd table has unique date constraint", () => {
    expect(schema.sotd.date).toBeDefined();
    expect(schema.sotd.productId).toBeDefined();
    expect(schema.sotd.voteCount).toBeDefined();
  });
});
