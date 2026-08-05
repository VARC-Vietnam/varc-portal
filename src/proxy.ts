import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import createMiddleware from "next-intl/middleware";
import { isAdminRole, type Role } from "@/lib/roles";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * TLS terminates at Cloudflare / NPM. Rebuild the request as the public https
 * origin so alternate links and redirects are not emitted as http://.
 */
function asPublicRequest(req: NextRequest): NextRequest {
  const publicBase =
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "");

  if (!publicBase?.startsWith("https://")) {
    return req;
  }

  const target = new URL(
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
    publicBase,
  );

  if (
    target.href === req.nextUrl.href &&
    req.headers.get("x-forwarded-proto") === "https"
  ) {
    return req;
  }

  const headers = new Headers(req.headers);
  headers.set("x-forwarded-proto", "https");
  headers.set("x-forwarded-host", target.host);
  return new NextRequest(target, {
    headers,
    method: req.method,
  });
}

function publicOrigin(req: NextRequest): string {
  return (
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    req.nextUrl.origin.replace(/^http:\/\//, "https://")
  );
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/") || pathname.startsWith("/media/")) {
    return NextResponse.next();
  }

  // Do not wrap next-intl with auth() — Auth.js converts the result to a plain
  // Response and breaks middleware rewrites/redirects under standalone.
  if (pathname.startsWith("/admin")) {
    const isLogin = pathname === "/admin/login";
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
      secureCookie: (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL)?.startsWith(
        "https://",
      ),
    });
    const role = token?.role as Role | undefined;
    const allowed = isAdminRole(role);
    const origin = publicOrigin(req);
    const homeUrl = new URL(`/${routing.defaultLocale}`, origin);

    // Signed in without admin permission → portal home (not login error).
    if (token && !allowed) {
      return NextResponse.redirect(homeUrl);
    }

    if (!isLogin && !allowed) {
      const url = new URL("/admin/login", origin);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    if (isLogin && allowed) {
      return NextResponse.redirect(new URL("/admin", origin));
    }

    return NextResponse.next();
  }

  return intlMiddleware(asPublicRequest(req));
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
