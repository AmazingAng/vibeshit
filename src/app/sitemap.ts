import type { MetadataRoute } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let productUrls: MetadataRoute.Sitemap = [];

  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = getDb(env.DB);

    const allProducts = await db.query.products.findMany({
      where: eq(products.status, "approved"),
      columns: { slug: true, createdAt: true },
    });

    productUrls = allProducts.map((p) => ({
      url: `https://vibeshit.org/product/${p.slug}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB may not be available during build
  }

  return [
    {
      url: "https://vibeshit.org",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://vibeshit.org/trending",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...productUrls,
  ];
}
