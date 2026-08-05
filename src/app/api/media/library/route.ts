import { auth } from "@/auth";
import { listMediaAdmin } from "@/lib/media/library";
import { isAdminRole } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const kind = searchParams.get("kind");
    const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

    const list = await listMediaAdmin({
      page,
      pageSize: 24,
      kind: kind === "image" || kind === "video" || kind === "file" ? kind : undefined,
      q: q || undefined,
    });

    return Response.json(list);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list media";
    console.error("[media library]", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
