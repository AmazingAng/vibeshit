import { describe, it, expect } from "vitest";
import {
  inferLocale,
  getMessages,
  formatTemplate,
  SUPPORTED_LOCALES,
  LOCALE_COOKIE_NAME,
} from "./i18n";

describe("inferLocale", () => {
  it("returns cookie locale when set to zh", () => {
    expect(inferLocale({ cookieLocale: "zh" })).toBe("zh");
  });

  it("returns cookie locale when set to en", () => {
    expect(inferLocale({ cookieLocale: "en" })).toBe("en");
  });

  it("normalizes zh-CN cookie to zh", () => {
    expect(inferLocale({ cookieLocale: "zh-CN" })).toBe("zh");
  });

  it("normalizes en-US cookie to en", () => {
    expect(inferLocale({ cookieLocale: "en-US" })).toBe("en");
  });

  it("detects Chinese country codes", () => {
    for (const cc of ["CN", "HK", "MO", "TW", "SG"]) {
      expect(inferLocale({ country: cc })).toBe("zh");
    }
  });

  it("detects Chinese country codes case-insensitively", () => {
    expect(inferLocale({ country: "cn" })).toBe("zh");
    expect(inferLocale({ country: "Tw" })).toBe("zh");
  });

  it("falls back to accept-language header", () => {
    expect(inferLocale({ acceptLanguage: "zh-CN,zh;q=0.9,en;q=0.8" })).toBe(
      "zh"
    );
    expect(inferLocale({ acceptLanguage: "en-US,en;q=0.9" })).toBe("en");
  });

  it("defaults to en when no signals", () => {
    expect(inferLocale({})).toBe("en");
    expect(inferLocale({ cookieLocale: null, acceptLanguage: null })).toBe(
      "en"
    );
  });

  it("cookie takes priority over country", () => {
    expect(inferLocale({ cookieLocale: "en", country: "CN" })).toBe("en");
  });

  it("country takes priority over accept-language", () => {
    expect(
      inferLocale({ country: "CN", acceptLanguage: "en-US,en;q=0.9" })
    ).toBe("zh");
  });

  it("ignores unknown country codes", () => {
    expect(inferLocale({ country: "US" })).toBe("en");
    expect(inferLocale({ country: "JP" })).toBe("en");
  });

  it("handles garbage accept-language gracefully", () => {
    expect(inferLocale({ acceptLanguage: ",,,,," })).toBe("en");
    expect(inferLocale({ acceptLanguage: "xyz" })).toBe("en");
  });
});

describe("getMessages", () => {
  it("returns English messages", () => {
    const msgs = getMessages("en");
    expect(msgs.common.trending).toBe("Trending");
    expect(msgs.home.today).toBe("Today");
  });

  it("returns Chinese messages", () => {
    const msgs = getMessages("zh");
    expect(msgs.common.trending).toBe("趋势榜");
    expect(msgs.home.today).toBe("今天");
  });

  it("all locale keys have the same structure", () => {
    const en = getMessages("en");
    const zh = getMessages("zh");
    const enKeys = Object.keys(en).sort();
    const zhKeys = Object.keys(zh).sort();
    expect(enKeys).toEqual(zhKeys);

    for (const section of enKeys) {
      const enSub = Object.keys(
        en[section as keyof typeof en] as Record<string, unknown>
      ).sort();
      const zhSub = Object.keys(
        zh[section as keyof typeof zh] as Record<string, unknown>
      ).sort();
      expect(enSub).toEqual(zhSub);
    }
  });
});

describe("formatTemplate", () => {
  it("replaces variables", () => {
    expect(formatTemplate("Hello {name}!", { name: "World" })).toBe(
      "Hello World!"
    );
  });

  it("replaces multiple variables", () => {
    expect(
      formatTemplate("{a} + {b} = {c}", { a: "1", b: "2", c: "3" })
    ).toBe("1 + 2 = 3");
  });

  it("leaves unknown variables empty", () => {
    expect(formatTemplate("Hello {unknown}!", {})).toBe("Hello !");
  });

  it("handles no variables", () => {
    expect(formatTemplate("No vars here", {})).toBe("No vars here");
  });
});

describe("constants", () => {
  it("exports supported locales", () => {
    expect(SUPPORTED_LOCALES).toContain("en");
    expect(SUPPORTED_LOCALES).toContain("zh");
  });

  it("exports cookie name", () => {
    expect(LOCALE_COOKIE_NAME).toBe("lang");
  });
});
