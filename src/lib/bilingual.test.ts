import { describe, it, expect } from "vitest";
import { getLocalizedTagline, getLocalizedDescription } from "./bilingual";

const product = {
  tagline: "Original tagline",
  taglineZh: "中文标语",
  taglineEn: "English tagline",
  description: "Original description",
  descriptionZh: "中文描述",
  descriptionEn: "English description",
};

describe("getLocalizedTagline", () => {
  it("returns Chinese tagline for zh locale", () => {
    expect(getLocalizedTagline(product, "zh")).toBe("中文标语");
  });

  it("returns English tagline for en locale", () => {
    expect(getLocalizedTagline(product, "en")).toBe("English tagline");
  });

  it("falls back to original tagline when zh is null", () => {
    const p = { ...product, taglineZh: null };
    expect(getLocalizedTagline(p, "zh")).toBe("Original tagline");
  });

  it("falls back to original tagline when en is null", () => {
    const p = { ...product, taglineEn: null };
    expect(getLocalizedTagline(p, "en")).toBe("Original tagline");
  });

  it("falls back to original tagline when zh is empty string", () => {
    const p = { ...product, taglineZh: "" };
    expect(getLocalizedTagline(p, "zh")).toBe("Original tagline");
  });

  it("falls back to original tagline when en is undefined", () => {
    const p = { tagline: "Original" };
    expect(getLocalizedTagline(p, "en")).toBe("Original");
    expect(getLocalizedTagline(p, "zh")).toBe("Original");
  });
});

describe("getLocalizedDescription", () => {
  it("returns Chinese description for zh locale", () => {
    expect(getLocalizedDescription(product, "zh")).toBe("中文描述");
  });

  it("returns English description for en locale", () => {
    expect(getLocalizedDescription(product, "en")).toBe("English description");
  });

  it("falls back to original description when zh is null", () => {
    const p = { ...product, descriptionZh: null };
    expect(getLocalizedDescription(p, "zh")).toBe("Original description");
  });

  it("falls back to original description when en is null", () => {
    const p = { ...product, descriptionEn: null };
    expect(getLocalizedDescription(p, "en")).toBe("Original description");
  });

  it("returns null when all descriptions are null/undefined", () => {
    const p = { tagline: "t", description: null };
    expect(getLocalizedDescription(p, "en")).toBeNull();
    expect(getLocalizedDescription(p, "zh")).toBeNull();
  });

  it("falls back through chain: localized -> original -> null", () => {
    const p = { tagline: "t", descriptionEn: null, descriptionZh: null, description: undefined };
    expect(getLocalizedDescription(p, "en")).toBeNull();
    expect(getLocalizedDescription(p, "zh")).toBeNull();
  });
});
