"use server";

import { getDb } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

const emailSchema = z.string().email("Invalid email address").max(255);

export async function subscribeToNewsletter(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  const result = emailSchema.safeParse(email);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  // Check if already exists
  const existing = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email))
    .limit(1);

  if (existing[0]) {
    if (existing[0].subscribed) {
      return { error: "already_subscribed" };
    }
    // Re-subscribe
    await db
      .update(newsletterSubscribers)
      .set({ subscribed: true, unsubscribedAt: null })
      .where(eq(newsletterSubscribers.id, existing[0].id));
    return { success: true };
  }

  await db.insert(newsletterSubscribers).values({
    email,
    token: crypto.randomUUID(),
  });

  return { success: true };
}
