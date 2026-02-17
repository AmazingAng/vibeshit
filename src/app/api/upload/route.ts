import { auth } from "@/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";

const MAX_SIZE_LOGO = 2 * 1024 * 1024; // 2MB
const MAX_SIZE_BANNER = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string; // "logo" or "banner"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPG, PNG, WebP, GIF" },
      { status: 400 }
    );
  }

  const maxSize = type === "banner" ? MAX_SIZE_BANNER : MAX_SIZE_LOGO;
  if (file.size > maxSize) {
    const mbLimit = maxSize / (1024 * 1024);
    return NextResponse.json(
      { error: `File too large. Max ${mbLimit}MB` },
      { status: 400 }
    );
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const key = `${type}/${crypto.randomUUID()}.${ext}`;

  const { env } = await getCloudflareContext({ async: true });
  await env.UPLOADS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const url = `/api/image/${key}`;

  return NextResponse.json({ url });
}
