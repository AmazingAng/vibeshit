"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { parseGitHubRepoUrl } from "@/lib/github";

export async function claimProduct(productId: string) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.username) {
    return { error: "Not authenticated" };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product[0]) {
    return { error: "Product not found" };
  }

  // Only auto-published (github-trending) products by system user can be claimed
  if (product[0].source !== "github-trending" || product[0].userId !== "system-github-trending") {
    return { error: "This product cannot be claimed" };
  }

  // Already claimed
  if (product[0].claimedAt) {
    return { error: "This product has already been claimed" };
  }

  // Parse GitHub URL and match owner
  if (!product[0].githubUrl) {
    return { error: "No GitHub URL associated with this product" };
  }

  const repo = parseGitHubRepoUrl(product[0].githubUrl);
  if (!repo) {
    return { error: "Invalid GitHub URL" };
  }

  // Case-insensitive match
  if (repo.owner.toLowerCase() !== session.user.username.toLowerCase()) {
    return { error: "Only the GitHub repo owner can claim this project" };
  }

  // Claim: transfer ownership
  await db
    .update(products)
    .set({
      userId: session.user.id,
      claimedAt: new Date().toISOString(),
    })
    .where(eq(products.id, productId));

  revalidatePath(`/`);
  return { success: true };
}
