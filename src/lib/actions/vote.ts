"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { votes, products, users } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";

export async function toggleVote(productId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const product = await db
    .select({ id: products.id, status: products.status, userId: products.userId, name: products.name, slug: products.slug })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product[0]) {
    return { error: "Product not found" };
  }
  if (product[0].status !== "approved") {
    return { error: "Product is not available" };
  }

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

    // Notify product owner (skip self-vote)
    if (product[0].userId !== session.user.id) {
      const voter = await db
        .select({ name: users.name, username: users.username })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      const voterName = voter[0]?.username ? `@${voter[0].username}` : (voter[0]?.name ?? "Someone");
      createNotification(db, {
        userId: product[0].userId,
        type: "vote",
        title: "New vote",
        message: `${voterName} voted for your product ${product[0].name}`,
        link: `/product/${product[0].slug}`,
      });
    }

    revalidatePath("/");
    return { voted: true };
  }
}
