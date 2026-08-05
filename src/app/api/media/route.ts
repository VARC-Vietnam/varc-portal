import { auth } from "@/auth";
import { getMediaConfig } from "@/lib/media/config";
import { buildObjectKey, putObject } from "@/lib/media/storage";
import { isAdminRole } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getMediaConfig();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Missing file field" }, { status: 400 });
    }

    const contentType = (file.type || "").toLowerCase();
    if (!config.allowedMime.includes(contentType)) {
      return Response.json(
        { error: `Unsupported file type: ${contentType || "unknown"}` },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > config.maxBytes) {
      return Response.json(
        {
          error: `File size must be between 1 byte and ${Math.floor(
            config.maxBytes / (1024 * 1024),
          )}MB`,
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = buildObjectKey(file.name || "upload.bin");
    const stored = await putObject(key, buffer, contentType);

    return Response.json(stored, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload media";
    console.error("[media upload]", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
