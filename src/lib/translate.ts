import { eq } from "drizzle-orm";
import { products } from "@/lib/db/schema";
import { fetchWithTimeout, extractJsonObject } from "@/lib/ai-helpers";
import type { Database } from "@/lib/db";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "MiniMax-M2.5";
const ANTHROPIC_BASE_URL =
  process.env.ANTHROPIC_BASE_URL || "https://api.minimaxi.com/anthropic";
const FALLBACK_MODEL = process.env.AI_REVIEW_MODEL || "claude-sonnet-4-20250514";
const FALLBACK_BASE_URL =
  process.env.AI_REVIEW_BASE_URL || "https://api.skyapi.org";

function isChinese(text: string): boolean {
  const cjk = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  return !!cjk && cjk.length / text.length > 0.3;
}

type TranslationResult = {
  taglineZh: string | null;
  taglineEn: string | null;
  descriptionZh: string | null;
  descriptionEn: string | null;
};

export async function translateForProduct(input: {
  tagline: string;
  description: string;
  anthropicApiKey: string;
  openaiApiKey: string;
}): Promise<TranslationResult | null> {
  const { tagline, description, anthropicApiKey, openaiApiKey } = input;
  const sourceIsChinese = isChinese(tagline + description);
  const targetLang = sourceIsChinese ? "English" : "Chinese (Simplified)";

  const prompt = [
    `Translate the following product tagline and description into ${targetLang}.`,
    "Return strict JSON only: {\"tagline\": \"...\", \"description\": \"...\"}",
    "",
    `Tagline: ${tagline}`,
    `Description: ${description}`,
  ].join("\n");

  const systemPrompt =
    "You are a professional translator for a developer community site. Translate accurately and naturally. Return JSON only.";

  let translated: { tagline?: string; description?: string } | null = null;

  // Try primary AI
  if (anthropicApiKey) {
    try {
      const res = await fetchWithTimeout(
        `${ANTHROPIC_BASE_URL.replace(/\/$/, "")}/v1/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 1024,
            temperature: 0.1,
            system: systemPrompt,
            messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
          }),
        },
        30000
      );

      if (res.ok) {
        const json = (await res.json()) as {
          content?: Array<{ type?: string; text?: string; thinking?: string }>;
        };
        const allText = (json.content ?? [])
          .map((part) => {
            if (part.type === "text" && typeof part.text === "string") return part.text;
            if (part.type === "thinking" && typeof part.thinking === "string") return part.thinking;
            return "";
          })
          .filter(Boolean)
          .join("\n");
        const jsonStr = extractJsonObject(allText);
        if (jsonStr) {
          translated = JSON.parse(jsonStr) as { tagline?: string; description?: string };
        }
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback AI
  if (!translated && openaiApiKey) {
    try {
      const res = await fetchWithTimeout(
        `${FALLBACK_BASE_URL.replace(/\/$/, "")}/v1/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": openaiApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: FALLBACK_MODEL,
            max_tokens: 1024,
            temperature: 0.1,
            system: systemPrompt,
            messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
          }),
        },
        30000
      );

      if (res.ok) {
        const json = (await res.json()) as {
          content?: Array<{ type?: string; text?: string }>;
        };
        const allText = (json.content ?? [])
          .filter((p) => p.type === "text" && typeof p.text === "string")
          .map((p) => p.text ?? "")
          .join("\n");
        const jsonStr = extractJsonObject(allText);
        if (jsonStr) {
          translated = JSON.parse(jsonStr) as { tagline?: string; description?: string };
        }
      }
    } catch {
      // Ignore
    }
  }

  if (!translated) return null;

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

export async function translateAndUpdate(
  db: Database,
  productId: string,
  tagline: string,
  description: string,
  apiKeys: { anthropicApiKey: string; openaiApiKey: string }
): Promise<void> {
  const result = await translateForProduct({
    tagline,
    description,
    ...apiKeys,
  });
  if (!result) return;

  await db
    .update(products)
    .set({
      taglineZh: result.taglineZh,
      taglineEn: result.taglineEn,
      descriptionZh: result.descriptionZh,
      descriptionEn: result.descriptionEn,
    })
    .where(eq(products.id, productId));
}
