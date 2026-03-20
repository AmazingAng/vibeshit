"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getUnreadCount() {
  const session = await auth();
  if (!session?.user?.id) return { count: 0 };

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, session.user.id), eq(notifications.read, false)));

  return { count: result[0].count };
}

export async function getNotifications(limit: number = 20) {
  const session = await auth();
  if (!session?.user?.id) return { notifications: [] };

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return { notifications: rows };
}

export async function markAsRead(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, session.user.id)));

  return { success: true };
}

export async function markAllAsRead() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, session.user.id), eq(notifications.read, false)));

  return { success: true };
}
