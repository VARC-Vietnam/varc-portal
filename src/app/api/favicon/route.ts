import { NextResponse } from "next/server";
import { getPublicSiteBranding } from "@/lib/cms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Resolves the CMS favicon and returns the image bytes (or redirects as a
 * last resort). Used by metadata and by the /favicon.ico → /api/favicon
 * redirect so browsers never see a baked-in Next.js icon.
 */
export async function GET(request: Request) {
  const branding = await getPublicSiteBranding("vi");
  const favicon = branding.faviconUrl.trim();
  if (!favicon) {
    return new NextResponse(null, { status: 204 });
  }

  const target =
    favicon.startsWith("http://") || favicon.startsWith("https://")
      ? favicon
      : new URL(favicon, request.url).toString();

  try {
    const upstream = await fetch(target, {
      // Favicon changes are rare; short cache is enough for CMS updates.
      next: { revalidate: 300 },
      headers: { Accept: "image/*,*/*" },
    });
    if (!upstream.ok) {
      return NextResponse.redirect(target, 307);
    }

    const contentType =
      upstream.headers.get("content-type")?.split(";")[0]?.trim() ||
      "image/png";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.redirect(target, 307);
  }
}
