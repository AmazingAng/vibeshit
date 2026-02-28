import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { updateUserProfile } from "@/lib/queries/products";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { bio, wechat, showWechat, twitterHandle, telegram, showTelegram } =
    body as Record<string, unknown>;

  const sanitizeStr = (v: unknown) =>
    typeof v === "string" ? v.trim().slice(0, 100) || null : null;

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  await updateUserProfile(db, session.user.id, {
    bio: typeof bio === "string" ? bio.trim().slice(0, 200) || null : null,
    wechat: sanitizeStr(wechat),
    showWechat: Boolean(showWechat),
    twitterHandle: sanitizeStr(twitterHandle),
    telegram: sanitizeStr(telegram),
    showTelegram: Boolean(showTelegram),
  });

  return NextResponse.json({ success: true });
}
