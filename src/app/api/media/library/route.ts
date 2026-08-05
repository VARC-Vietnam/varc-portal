import { auth } from "@/auth";
import { listAllMediaAdmin, listMediaAdmin } from "@/lib/media/library";
import { isAdminRole } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kindParam = searchParams.get("kind");
    const kind =
      kindParam === "image" || kindParam === "video" || kindParam === "file"
        ? kindParam
        : undefined;
    const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
    const all = searchParams.get("all") === "1";

    if (all) {
      const items = await listAllMediaAdmin({
        kind,
        q: q || undefined,
      });
      return Response.json({
        items,
        total: items.length,
        page: 1,
        pageSize: items.length,
        totalPages: 1,
      });
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const list = await listMediaAdmin({
      page,
      pageSize: 24,
      kind,
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
