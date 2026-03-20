import type { Database } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export async function createNotification(
  db: Database,
  data: {
    userId: string;
    type: "vote" | "comment" | "reply";
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link ?? null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
  } catch {
    // Fire-and-forget: never let notification creation break the main flow
  }
}
