import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const objectKey = key.join("/");

  const { env } = await getCloudflareContext({ async: true });
  const object = await env.UPLOADS.get(objectKey);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const body = await object.arrayBuffer();

  return new Response(body, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType ?? "application/octet-stream",
      "Content-Length": body.byteLength.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
