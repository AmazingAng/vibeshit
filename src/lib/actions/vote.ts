"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { votes, products } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";

export async function toggleVote(productId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const existing = await db
    .select()
    .from(votes)
    .where(
      and(eq(votes.userId, session.user.id), eq(votes.productId, productId))
    )
    .limit(1);

  if (existing.length > 0) {
    await db.batch([
      db
        .delete(votes)
        .where(
          and(eq(votes.userId, session.user.id), eq(votes.productId, productId))
        ),
      db
        .update(products)
        .set({ shitCount: sql`${products.shitCount} - 1` })
        .where(eq(products.id, productId)),
    ]);

    revalidatePath("/");
    return { voted: false };
  } else {
    await db.batch([
      db.insert(votes).values({
        userId: session.user.id,
        productId,
      }),
      db
        .update(products)
        .set({ shitCount: sql`${products.shitCount} + 1` })
        .where(eq(products.id, productId)),
    ]);

    revalidatePath("/");
    return { voted: true };
  }
}
