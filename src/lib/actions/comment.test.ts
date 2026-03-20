import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Tests for comment validation logic.
 * We replicate the schema from comment.ts to test validation
 * without importing server-side dependencies.
 */
const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
  productId: z.string().min(1),
});

describe("comment validation schema", () => {
  it("accepts valid comment", () => {
    const result = commentSchema.safeParse({
      content: "Great project!",
      productId: "abc-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = commentSchema.safeParse({
      content: "",
      productId: "abc-123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Comment cannot be empty");
    }
  });

  it("rejects content exceeding 2000 chars", () => {
    const result = commentSchema.safeParse({
      content: "a".repeat(2001),
      productId: "abc-123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts content at exactly 2000 chars", () => {
    const result = commentSchema.safeParse({
      content: "a".repeat(2000),
      productId: "abc-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty productId", () => {
    const result = commentSchema.safeParse({
      content: "Hello",
      productId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(commentSchema.safeParse({}).success).toBe(false);
    expect(commentSchema.safeParse({ content: "hello" }).success).toBe(false);
    expect(
      commentSchema.safeParse({ productId: "abc" }).success
    ).toBe(false);
  });

  it("accepts unicode content", () => {
    const result = commentSchema.safeParse({
      content: "太棒了！🎉 This is great!",
      productId: "abc-123",
    });
    expect(result.success).toBe(true);
  });
});
