import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for translate.ts pure logic.
 * We replicate the isChinese helper and test the translation result mapping
 * without hitting real AI endpoints.
 */

function isChinese(text: string): boolean {
  const cjk = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  return !!cjk && cjk.length / text.length > 0.3;
}

describe("isChinese", () => {
  it("detects Chinese text", () => {
    expect(isChinese("这是一个中文标语")).toBe(true);
  });

  it("detects English text", () => {
    expect(isChinese("This is an English tagline")).toBe(false);
  });

  it("detects mixed text with majority Chinese", () => {
    expect(isChinese("用AI构建的工具 tool")).toBe(true);
  });

  it("detects mixed text with majority English", () => {
    expect(isChinese("An AI-powered tool 工具")).toBe(false);
  });

  it("handles empty string", () => {
    expect(isChinese("")).toBe(false);
  });

  it("handles pure ASCII", () => {
    expect(isChinese("hello world 123!@#")).toBe(false);
  });

  it("detects CJK extension B characters", () => {
    // U+3400-U+4DBF range
    expect(isChinese("㐀㐁㐂㐃")).toBe(true);
  });

  it("threshold is > 30%", () => {
    // 2 CJK chars in 7 total chars = 28.6% → not Chinese
    expect(isChinese("abcde中文")).toBe(false);
    // 3 CJK chars in 7 total chars = 42.9% → Chinese
    expect(isChinese("abcd中文字")).toBe(true);
  });
});

describe("translation result mapping", () => {
  // Replicate the mapping logic from translateForProduct
  function mapTranslation(
    tagline: string,
    description: string,
    translated: { tagline?: string; description?: string }
  ) {
    const sourceIsChinese = isChinese(tagline + description);
    if (sourceIsChinese) {
      return {
        taglineZh: tagline,
        taglineEn: translated.tagline || null,
        descriptionZh: description || null,
        descriptionEn: translated.description || null,
      };
    } else {
      return {
        taglineEn: tagline,
        taglineZh: translated.tagline || null,
        descriptionEn: description || null,
        descriptionZh: translated.description || null,
      };
    }
  }

  it("maps Chinese input → keeps Chinese originals, stores English translations", () => {
    const result = mapTranslation("中文标语", "中文描述", {
      tagline: "Chinese tagline",
      description: "Chinese description",
    });
    expect(result).toEqual({
      taglineZh: "中文标语",
      taglineEn: "Chinese tagline",
      descriptionZh: "中文描述",
      descriptionEn: "Chinese description",
    });
  });

  it("maps English input → keeps English originals, stores Chinese translations", () => {
    const result = mapTranslation("English tagline", "English description", {
      tagline: "英文标语",
      description: "英文描述",
    });
    expect(result).toEqual({
      taglineEn: "English tagline",
      taglineZh: "英文标语",
      descriptionEn: "English description",
      descriptionZh: "英文描述",
    });
  });

  it("handles missing translation fields gracefully", () => {
    const result = mapTranslation("English tagline", "English description", {});
    expect(result).toEqual({
      taglineEn: "English tagline",
      taglineZh: null,
      descriptionEn: "English description",
      descriptionZh: null,
    });
  });

  it("handles empty description", () => {
    const result = mapTranslation("English tagline", "", {
      tagline: "翻译",
      description: "",
    });
    expect(result).toEqual({
      taglineEn: "English tagline",
      taglineZh: "翻译",
      descriptionEn: null,
      descriptionZh: null,
    });
  });
});

describe("translateForProduct integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when both API keys are empty", async () => {
    // Import the actual function — it will try to call APIs, both will be skipped
    const { translateForProduct } = await import("./translate");
    const result = await translateForProduct({
      tagline: "Test",
      description: "Test desc",
      anthropicApiKey: "",
      openaiApiKey: "",
    });
    expect(result).toBeNull();
  });

  it("returns null when API calls fail", async () => {
    // Mock fetch to always reject
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const { translateForProduct } = await import("./translate");
    const result = await translateForProduct({
      tagline: "Test",
      description: "Test desc",
      anthropicApiKey: "key1",
      openaiApiKey: "key2",
    });
    expect(result).toBeNull();

    vi.unstubAllGlobals();
  });

  it("parses successful primary AI response for English input", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        content: [
          {
            type: "text",
            text: '{"tagline": "测试标语", "description": "测试描述"}',
          },
        ],
      }),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const { translateForProduct } = await import("./translate");
    const result = await translateForProduct({
      tagline: "Test tagline",
      description: "Test description",
      anthropicApiKey: "key1",
      openaiApiKey: "",
    });

    expect(result).toEqual({
      taglineEn: "Test tagline",
      taglineZh: "测试标语",
      descriptionEn: "Test description",
      descriptionZh: "测试描述",
    });

    vi.unstubAllGlobals();
  });

  it("parses successful primary AI response for Chinese input", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        content: [
          {
            type: "text",
            text: '{"tagline": "Test tagline", "description": "Test description"}',
          },
        ],
      }),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const { translateForProduct } = await import("./translate");
    const result = await translateForProduct({
      tagline: "中文测试标语",
      description: "中文测试描述",
      anthropicApiKey: "key1",
      openaiApiKey: "",
    });

    expect(result).toEqual({
      taglineZh: "中文测试标语",
      taglineEn: "Test tagline",
      descriptionZh: "中文测试描述",
      descriptionEn: "Test description",
    });

    vi.unstubAllGlobals();
  });

  it("falls back to secondary AI when primary fails", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Primary fails
        return Promise.resolve({ ok: false, status: 500 });
      }
      // Fallback succeeds
      return Promise.resolve({
        ok: true,
        json: async () => ({
          content: [
            {
              type: "text",
              text: '{"tagline": "翻译标语", "description": "翻译描述"}',
            },
          ],
        }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const { translateForProduct } = await import("./translate");
    const result = await translateForProduct({
      tagline: "English tagline",
      description: "English desc",
      anthropicApiKey: "key1",
      openaiApiKey: "key2",
    });

    expect(result).not.toBeNull();
    expect(result!.taglineZh).toBe("翻译标语");
    expect(mockFetch).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });
});
