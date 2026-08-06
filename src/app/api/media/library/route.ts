import { auth } from "@/auth";
import { listAllMediaAdmin, listMediaAdmin } from "@/lib/media/library";
import { logServerError, publicErrorMessage } from "@/lib/safe-error";
import { isAdminRole } from "@/lib/roles";

export const runtime = "nodejs";

const MAX_QUERY_LEN = 100;

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
    const qRaw = searchParams.get("q")?.trim() ?? "";
    const q = qRaw.slice(0, MAX_QUERY_LEN).toLowerCase();
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

    const page = Math.max(1, Math.min(1000, Number(searchParams.get("page")) || 1));
    const list = await listMediaAdmin({
      page,
      pageSize: 24,
      kind,
      q: q || undefined,
    });

    return Response.json(list);
  } catch (error) {
    logServerError("media library", error);
    return Response.json(
      { error: publicErrorMessage(error, "Failed to list media") },
      { status: 500 },
    );
  }
}
