import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { authConfig } from "@/auth.config";
import { isAdminRole } from "@/lib/roles";
import { routing } from "@/i18n/routing";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

/**
 * TLS terminates at Cloudflare / NPM. The in-cluster hop is HTTP, so
 * ingress often reports x-forwarded-proto=http. Rebuild the request URL as
 * https so next-intl / Auth.js do not emit a self-redirect loop.
 */
function asPublicRequest(req: NextRequest): NextRequest {
  const publicBase =
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "");

  if (!publicBase?.startsWith("https://") && req.nextUrl.protocol === "https:") {
    return req;
  }

  const target = publicBase
    ? new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, publicBase)
    : (() => {
        const url = req.nextUrl.clone();
        url.protocol = "https:";
        return url;
      })();

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

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const isLogin = pathname === "/admin/login";
    const role = req.auth?.user?.role;
    const allowed = isAdminRole(role);
    const origin = publicOrigin(req);

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
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
