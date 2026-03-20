import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const subscriber = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.token, token))
    .limit(1);

  if (!subscriber[0]) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400 });
  }

  await db
    .update(newsletterSubscribers)
    .set({
      subscribed: false,
      unsubscribedAt: new Date().toISOString(),
    })
    .where(eq(newsletterSubscribers.id, subscriber[0].id));

  return new NextResponse(
    `<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
      <div style="text-align:center">
        <h1>Unsubscribed</h1>
        <p>You've been unsubscribed from the Vibe Shit newsletter.</p>
        <a href="https://vibeshit.org">Back to Vibe Shit</a>
      </div>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
