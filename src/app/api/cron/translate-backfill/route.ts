import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { translateForProduct } from "@/lib/translate";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const { env } = await getCloudflareContext({ async: true });
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const expected = runtimeEnv.MIGRATE_SECRET ?? process.env.MIGRATE_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb(env.DB);
  const anthropicApiKey = String(
    runtimeEnv.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || ""
  );
  const openaiApiKey = String(
    runtimeEnv.AI_REVIEW_API_KEY || process.env.AI_REVIEW_API_KEY || ""
  );

  const batchSize = parseInt(
    request.nextUrl.searchParams.get("limit") ?? "10",
    10
  );

  // Find products missing bilingual fields
  const pending = await db
    .select({
      id: products.id,
      tagline: products.tagline,
      description: products.description,
    })
    .from(products)
    .where(and(isNull(products.taglineEn), isNull(products.taglineZh)))
    .limit(batchSize);

  let translated = 0;
  let failed = 0;

  for (const product of pending) {
    try {
      const result = await translateForProduct({
        tagline: product.tagline,
        description: product.description || "",
        anthropicApiKey,
        openaiApiKey,
      });

      if (result) {
        await db
          .update(products)
          .set({
            taglineZh: result.taglineZh,
            taglineEn: result.taglineEn,
            descriptionZh: result.descriptionZh,
            descriptionEn: result.descriptionEn,
          })
          .where(eq(products.id, product.id));
        translated++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    total: pending.length,
    translated,
    failed,
    remaining: pending.length === batchSize ? "possibly more" : 0,
  });
}
