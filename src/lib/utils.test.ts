import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (className merge utility)", () => {
  it("merges simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("deduplicates tailwind classes", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("merges conflicting tailwind utilities", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("preserves non-conflicting classes", () => {
    const result = cn("font-bold", "text-sm", "p-4");
    expect(result).toContain("font-bold");
    expect(result).toContain("text-sm");
    expect(result).toContain("p-4");
  });
});
