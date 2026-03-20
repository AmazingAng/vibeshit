import { describe, it, expect } from "vitest";

/**
 * Tests for GitHub trending cron helper functions.
 * We replicate the pure functions to test without server deps.
 */

function parseTrendingHtml(html: string): Array<{
  fullName: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  todayStars: number;
}> {
  const repos: Array<{
    fullName: string;
    url: string;
    description: string;
    language: string;
    stars: number;
    todayStars: number;
  }> = [];
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

  for (const fullName of repoNames.slice(0, 30)) {
    repos.push({
      fullName,
      url: `https://github.com/${fullName}`,
      description: "",
      language: "",
      stars: 0,
      todayStars: 0,
    });
  }

  return repos;
}

describe("parseTrendingHtml", () => {
  it("extracts repos from trending HTML", () => {
    const html = `
      <article class="Box-row">
        <h2 class="h3 lh-condensed">
          <a href="/openai/gpt-tools" data-hydro-click>gpt-tools</a>
        </h2>
      </article>
      <article class="Box-row">
        <h2 class="h3 lh-condensed">
          <a href="/anthropics/claude-code" data-hydro-click>claude-code</a>
        </h2>
      </article>
    `;
    const repos = parseTrendingHtml(html);
    expect(repos).toHaveLength(2);
    expect(repos[0].fullName).toBe("openai/gpt-tools");
    expect(repos[0].url).toBe("https://github.com/openai/gpt-tools");
    expect(repos[1].fullName).toBe("anthropics/claude-code");
  });

  it("deduplicates repos", () => {
    const html = `
      <h2><a href="/user/repo">repo</a></h2>
      <h2><a href="/user/repo">repo</a></h2>
    `;
    const repos = parseTrendingHtml(html);
    expect(repos).toHaveLength(1);
  });

  it("limits to 30 repos", () => {
    let html = "";
    for (let i = 0; i < 50; i++) {
      html += `<h2><a href="/user/repo-${i}">repo-${i}</a></h2>\n`;
    }
    const repos = parseTrendingHtml(html);
    expect(repos).toHaveLength(30);
  });

  it("ignores links without owner/repo format", () => {
    const html = `
      <h2><a href="/settings">settings</a></h2>
      <h2><a href="/user/repo">repo</a></h2>
    `;
    const repos = parseTrendingHtml(html);
    expect(repos).toHaveLength(1);
    expect(repos[0].fullName).toBe("user/repo");
  });

  it("returns empty array for empty HTML", () => {
    expect(parseTrendingHtml("")).toHaveLength(0);
    expect(parseTrendingHtml("<div>no repos</div>")).toHaveLength(0);
  });
});

describe("AI analysis response parsing", () => {
  function extractJsonObject(text: string): string | null {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
  }

  it("parses a valid vibe project analysis", () => {
    const response = `{
      "isVibeProject": true,
      "name": "AI Chat",
      "tagline": "Chat with any LLM",
      "description": "A universal chat interface for LLMs",
      "agent": "Cursor",
      "llm": "Claude 3.5 Sonnet",
      "tags": ["ai", "chat", "llm"],
      "reason": "Built with Cursor AI agent"
    }`;
    const json = extractJsonObject(response);
    expect(json).not.toBeNull();
    const parsed = JSON.parse(json!);
    expect(parsed.isVibeProject).toBe(true);
    expect(parsed.name).toBe("AI Chat");
    expect(parsed.tags).toContain("ai");
  });

  it("parses a rejection", () => {
    const response = `{
      "isVibeProject": false,
      "name": "",
      "tagline": "",
      "description": "",
      "agent": "",
      "llm": "",
      "tags": [],
      "reason": "This is a traditional web framework, not AI-related"
    }`;
    const json = extractJsonObject(response);
    const parsed = JSON.parse(json!);
    expect(parsed.isVibeProject).toBe(false);
  });

  it("extracts JSON from markdown code block", () => {
    const response = "Here is my analysis:\n```json\n" +
      '{"isVibeProject": true, "name": "Test", "tagline": "t", "description": "d", "agent": "v0", "llm": "GPT-4", "tags": [], "reason": "ok"}' +
      "\n```\nDone.";
    const json = extractJsonObject(response);
    expect(json).not.toBeNull();
    const parsed = JSON.parse(json!);
    expect(parsed.isVibeProject).toBe(true);
  });
});

describe("slug generation for auto-published products", () => {
  const { slugify: translitSlugify } = require("transliteration");

  function makeSlug(text: string): string {
    const slug = translitSlugify(text, {
      lowercase: true,
      separator: "-",
      allowedChars: "a-zA-Z0-9",
    }).slice(0, 60);
    return slug || `project-${Math.random().toString(36).slice(2, 8)}`;
  }

  it("creates slug from repo-style names", () => {
    expect(makeSlug("awesome-ai-tool")).toBe("awesome-ai-tool");
  });

  it("handles camelCase names", () => {
    const result = makeSlug("chatGPT-clone");
    expect(result).toMatch(/^[a-z0-9-]+$/);
    expect(result).toContain("chatgpt");
  });

  it("handles names with dots and special chars", () => {
    const result = makeSlug("v0.dev-clone");
    expect(result).toMatch(/^[a-z0-9-]+$/);
  });
});
