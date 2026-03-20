"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { comments, products, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCommentsByProductId } from "@/lib/queries/products";
import { createNotification } from "@/lib/notifications";

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
  productId: z.string().min(1),
  parentCommentId: z.string().optional(),
});

export async function addComment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const raw = {
    content: formData.get("content") as string,
    productId: formData.get("productId") as string,
    parentCommentId: (formData.get("parentCommentId") as string) || undefined,
  };

  const result = commentSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const product = await db
    .select({ id: products.id, status: products.status, userId: products.userId, name: products.name, slug: products.slug })
    .from(products)
    .where(eq(products.id, result.data.productId))
    .limit(1);

  if (!product[0]) {
    return { error: "Product not found" };
  }
  if (product[0].status !== "approved") {
    return { error: "Product is not available" };
  }

  // Validate parentCommentId: only allow one level of nesting
  let parentCommentId: string | null = null;
  if (result.data.parentCommentId) {
    const parent = await db
      .select({ id: comments.id, parentCommentId: comments.parentCommentId })
      .from(comments)
      .where(eq(comments.id, result.data.parentCommentId))
      .limit(1);

    if (!parent[0]) {
      return { error: "Parent comment not found" };
    }
    if (parent[0].parentCommentId) {
      return { error: "Cannot reply to a reply" };
    }
    parentCommentId = parent[0].id;
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.insert(comments).values({
    id,
    userId: session.user.id,
    productId: result.data.productId,
    parentCommentId,
    content: result.data.content,
    createdAt,
  });

  const user = await db
    .select({ name: users.name, username: users.username, image: users.image })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const commenterName = user[0]?.username ? `@${user[0].username}` : (user[0]?.name ?? "Someone");
  const productLink = `/product/${product[0].slug}`;

  if (parentCommentId) {
    // Reply: notify the parent comment author
    const parentComment = await db
      .select({ userId: comments.userId })
      .from(comments)
      .where(eq(comments.id, parentCommentId))
      .limit(1);
    if (parentComment[0] && parentComment[0].userId !== session.user.id) {
      createNotification(db, {
        userId: parentComment[0].userId,
        type: "reply",
        title: "New reply",
        message: `${commenterName} replied to your comment on ${product[0].name}`,
        link: productLink,
      });
    }
  } else {
    // Top-level comment: notify the product owner
    if (product[0].userId !== session.user.id) {
      createNotification(db, {
        userId: product[0].userId,
        type: "comment",
        title: "New comment",
        message: `${commenterName} commented on your product ${product[0].name}`,
        link: productLink,
      });
    }
  }

  revalidatePath(`/`);
  return {
    success: true,
    comment: {
      id,
      content: result.data.content,
      createdAt,
      userId: session.user.id,
      parentCommentId,
      userName: user[0]?.name ?? null,
      userUsername: user[0]?.username ?? null,
      userImage: user[0]?.image ?? null,
    },
  };
}

export async function deleteComment(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const comment = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!comment[0]) return { error: "Comment not found" };
  if (comment[0].userId !== session.user.id) {
    return { error: "Not authorized" };
  }

  // Delete replies first (cascade), then the comment itself
  await db.delete(comments).where(eq(comments.parentCommentId, commentId));
  await db.delete(comments).where(eq(comments.id, commentId));
  revalidatePath(`/`);
  return { success: true };
}

export async function loadMoreComments(productId: string, offset: number) {
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const product = await db
    .select({ id: products.id, status: products.status })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product[0] || product[0].status !== "approved") {
    return { comments: [], hasMore: false };
  }

  return getCommentsByProductId(db, productId, 20, offset);
}
