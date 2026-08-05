import { Readable } from "node:stream";
import { getMediaConfig } from "@/lib/media/config";
import { getObjectStream } from "@/lib/media/storage";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ key: string[] }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { key: parts } = await params;
    const key = parts.map(decodeURIComponent).join("/");
    if (!key) {
      return new Response("Not found", { status: 404 });
    }

    const config = getMediaConfig();
    // Prefer CDN / MinIO public URL when not using local disk.
    if (config.driver === "s3") {
      return Response.redirect(`${config.publicUrl}/${key}`, 302);
    }

    const { stream, contentType, size } = await getObjectStream(key);
    const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(typeof size === "number"
          ? { "Content-Length": String(size) }
          : {}),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not found";
    const status = message === "Not found" || message === "Invalid media key" ? 404 : 500;
    if (status === 500) console.error("[media get]", error);
    return new Response(message, { status });
  }
}
