"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { comments, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
  productId: z.string().min(1),
});

export async function addComment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const raw = {
    content: formData.get("content") as string,
    productId: formData.get("productId") as string,
  };

  const result = commentSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.insert(comments).values({
    id,
    userId: session.user.id,
    productId: result.data.productId,
    content: result.data.content,
    createdAt,
  });

  const user = await db
    .select({ name: users.name, username: users.username, image: users.image })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  revalidatePath(`/`);
  return {
    success: true,
    comment: {
      id,
      content: result.data.content,
      createdAt,
      userId: session.user.id,
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

  await db.delete(comments).where(eq(comments.id, commentId));
  revalidatePath(`/`);
  return { success: true };
}
