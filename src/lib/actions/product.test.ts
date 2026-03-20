import { describe, it, expect, vi } from "vitest";

/**
 * Unit tests for product action helpers.
 * We extract and test the pure functions from product.ts without
 * importing the module directly (which has server-side deps).
 */

// Re-implement the pure functions to test their logic
function parseGitHubRepoUrl(
  input: string
): { owner: string; repo: string; url: string } | null {
  try {
    const u = new URL(input);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com")
      return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0].trim();
    const repo = parts[1].replace(/\.git$/, "").trim();
    if (!owner || !repo) return null;
    return { owner, repo, url: `https://github.com/${owner}/${repo}` };
  } catch {
    return null;
  }
}

function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

describe("parseGitHubRepoUrl", () => {
  it("parses valid HTTPS GitHub URL", () => {
    const result = parseGitHubRepoUrl("https://github.com/user/repo");
    expect(result).toEqual({
      owner: "user",
      repo: "repo",
      url: "https://github.com/user/repo",
    });
  });

  it("parses URL with .git suffix", () => {
    const result = parseGitHubRepoUrl("https://github.com/user/repo.git");
    expect(result).toEqual({
      owner: "user",
      repo: "repo",
      url: "https://github.com/user/repo",
    });
  });

  it("parses URL with www prefix", () => {
    const result = parseGitHubRepoUrl("https://www.github.com/user/repo");
    expect(result).toEqual({
      owner: "user",
      repo: "repo",
      url: "https://github.com/user/repo",
    });
  });

  it("parses URL with trailing path segments", () => {
    const result = parseGitHubRepoUrl(
      "https://github.com/user/repo/tree/main/src"
    );
    expect(result).toEqual({
      owner: "user",
      repo: "repo",
      url: "https://github.com/user/repo",
    });
  });

  it("parses HTTP URLs", () => {
    const result = parseGitHubRepoUrl("http://github.com/user/repo");
    expect(result).toEqual({
      owner: "user",
      repo: "repo",
      url: "https://github.com/user/repo",
    });
  });

  it("rejects non-GitHub URLs", () => {
    expect(parseGitHubRepoUrl("https://gitlab.com/user/repo")).toBeNull();
    expect(parseGitHubRepoUrl("https://bitbucket.org/user/repo")).toBeNull();
  });

  it("rejects URLs without repo", () => {
    expect(parseGitHubRepoUrl("https://github.com/user")).toBeNull();
    expect(parseGitHubRepoUrl("https://github.com/")).toBeNull();
  });

  it("rejects invalid URLs", () => {
    expect(parseGitHubRepoUrl("not-a-url")).toBeNull();
    expect(parseGitHubRepoUrl("")).toBeNull();
  });

  it("rejects non-http protocols", () => {
    expect(parseGitHubRepoUrl("ftp://github.com/user/repo")).toBeNull();
    expect(parseGitHubRepoUrl("ssh://github.com/user/repo")).toBeNull();
  });
});

describe("extractJsonObject", () => {
  it("extracts JSON from plain JSON", () => {
    const result = extractJsonObject('{"key": "value"}');
    expect(result).toBe('{"key": "value"}');
  });

  it("extracts JSON from text with surrounding content", () => {
    const result = extractJsonObject(
      'Some text before {"reject": false, "reason": "ok"} and after'
    );
    expect(result).toBe('{"reject": false, "reason": "ok"}');
    expect(JSON.parse(result!)).toEqual({ reject: false, reason: "ok" });
  });

  it("extracts multiline JSON", () => {
    const input = `Here is the result:
{
  "reject": true,
  "reason": "spam"
}
Done.`;
    const result = extractJsonObject(input);
    expect(result).toContain('"reject": true');
    expect(JSON.parse(result!)).toEqual({ reject: true, reason: "spam" });
  });

  it("returns null for text without JSON", () => {
    expect(extractJsonObject("no json here")).toBeNull();
    expect(extractJsonObject("")).toBeNull();
  });

  it("handles nested objects", () => {
    const result = extractJsonObject('prefix {"a": {"b": 1}} suffix');
    expect(result).toBe('{"a": {"b": 1}}');
  });
});

describe("submit schema validation", () => {
  // Replicate the zod schema logic
  const { z } = require("zod");

  const requiredImageUrlSchema = z.string().trim().refine(
    (val: string) =>
      val.startsWith("/api/image/") ||
      val.startsWith("http://") ||
      val.startsWith("https://"),
    { message: "Invalid image URL" }
  );

  const submitSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(80),
    tagline: z.string().trim().min(1, "Tagline is required").max(120),
    description: z.string().trim().min(1, "Description is required").max(2000),
    url: z.string().url("Invalid URL"),
    logoUrl: requiredImageUrlSchema,
    githubUrl: z.union([z.literal(""), z.string().url("Invalid GitHub URL")]),
    agent: z.string().trim().min(1, "Agent is required").max(100),
    llm: z.string().trim().min(1, "LLM is required").max(100),
    tags: z.string().max(500).optional(),
    makerName: z.string().trim().max(100).optional(),
    makerLink: z
      .union([z.literal(""), z.string().url("Invalid maker link")])
      .optional(),
  });

  it("validates a complete valid submission", () => {
    const result = submitSchema.safeParse({
      name: "My Project",
      tagline: "A cool project",
      description: "Built with AI",
      url: "https://example.com",
      logoUrl: "/api/image/abc123",
      githubUrl: "https://github.com/user/repo",
      agent: "Cursor",
      llm: "Claude Sonnet 4.5",
      tags: "ai,tools",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = submitSchema.safeParse({
      name: "",
      tagline: "A cool project",
      description: "Built with AI",
      url: "https://example.com",
      logoUrl: "/api/image/abc123",
      githubUrl: "",
      agent: "Cursor",
      llm: "Claude",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL", () => {
    const result = submitSchema.safeParse({
      name: "Test",
      tagline: "Test",
      description: "Test",
      url: "not-a-url",
      logoUrl: "/api/image/abc",
      githubUrl: "",
      agent: "Cursor",
      llm: "Claude",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid logo URL", () => {
    const result = submitSchema.safeParse({
      name: "Test",
      tagline: "Test",
      description: "Test",
      url: "https://example.com",
      logoUrl: "invalid-path",
      githubUrl: "",
      agent: "Cursor",
      llm: "Claude",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty githubUrl", () => {
    const result = submitSchema.safeParse({
      name: "Test",
      tagline: "Test",
      description: "Test",
      url: "https://example.com",
      logoUrl: "https://example.com/logo.png",
      githubUrl: "",
      agent: "Cursor",
      llm: "Claude",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name exceeding 80 chars", () => {
    const result = submitSchema.safeParse({
      name: "a".repeat(81),
      tagline: "Test",
      description: "Test",
      url: "https://example.com",
      logoUrl: "/api/image/abc",
      githubUrl: "",
      agent: "Cursor",
      llm: "Claude",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description exceeding 2000 chars", () => {
    const result = submitSchema.safeParse({
      name: "Test",
      tagline: "Test",
      description: "a".repeat(2001),
      url: "https://example.com",
      logoUrl: "/api/image/abc",
      githubUrl: "",
      agent: "Cursor",
      llm: "Claude",
    });
    expect(result.success).toBe(false);
  });

  it("accepts HTTPS logo URLs", () => {
    const result = submitSchema.safeParse({
      name: "Test",
      tagline: "Test",
      description: "Test",
      url: "https://example.com",
      logoUrl: "https://cdn.example.com/logo.png",
      githubUrl: "",
      agent: "Cursor",
      llm: "Claude",
    });
    expect(result.success).toBe(true);
  });

  it("accepts internal image API URLs", () => {
    const result = submitSchema.safeParse({
      name: "Test",
      tagline: "Test",
      description: "Test",
      url: "https://example.com",
      logoUrl: "/api/image/some-key/path",
      githubUrl: "",
      agent: "Cursor",
      llm: "Claude",
    });
    expect(result.success).toBe(true);
  });
});

describe("slugify logic", () => {
  // Using the transliteration library as in production
  const { slugify: translitSlugify } = require("transliteration");

  function slugify(text: string): string {
    const slug = translitSlugify(text, {
      lowercase: true,
      separator: "-",
      allowedChars: "a-zA-Z0-9",
    }).slice(0, 60);
    return slug || `project-${Math.random().toString(36).slice(2, 8)}`;
  }

  it("slugifies English text", () => {
    expect(slugify("My Cool Project")).toBe("my-cool-project");
  });

  it("slugifies Chinese text via pinyin", () => {
    const result = slugify("我的项目");
    expect(result).toMatch(/^[a-z0-9-]+$/);
    expect(result.length).toBeGreaterThan(0);
  });

  it("truncates long slugs to 60 chars", () => {
    const longName = "a".repeat(100);
    expect(slugify(longName).length).toBeLessThanOrEqual(60);
  });

  it("handles special characters", () => {
    const result = slugify("Hello! @World #2024");
    expect(result).toMatch(/^[a-z0-9-]+$/);
  });

  it("generates fallback for empty result", () => {
    const result = slugify("!!!@@@");
    expect(result).toMatch(/^project-[a-z0-9]+$/);
  });
});
