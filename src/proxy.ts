import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { AUTH_COOKIE_PREFIX } from "@/core/modules/auth/utils";
import { DEFAULT_LOCALE, hasLocale, stripLocale } from "@/core/locale/config";
import { assertSameOrigin, CrossOriginError } from "@/core/utils/request";

function guardAdmin(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const hasSessionCookie = getSessionCookie(request, {
    cookiePrefix: AUTH_COOKIE_PREFIX,
  });
  if (hasSessionCookie) {
    // Second lock next to SameSite on the session cookie: no admin action from another site. The real login check is in the routes.
    if (pathname.startsWith("/api/") && request.method !== "GET" && request.method !== "HEAD") {
      try {
        assertSameOrigin(request);
      } catch (error) {
        if (error instanceof CrossOriginError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        throw error;
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

/* The default language has no prefix: /create is served by /nl/create, and /nl/create moves to /create. */
function routeLocale(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const prefix = pathname.split("/")[1];
  const url = request.nextUrl.clone();

  if (prefix === DEFAULT_LOCALE) {
    url.pathname = stripLocale(pathname);
    return NextResponse.redirect(url);
  }
  if (hasLocale(prefix)) return NextResponse.next();

  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin");
  return isAdmin ? guardAdmin(request) : routeLocale(request);
}

export const config = {
  // The backoffice, and every shop page: not the other API routes, Next's own files, the test pages or files with an extension.
  matcher: ["/admin/:path*", "/api/admin/:path*", "/((?!api/|_next/|admin|dev/|.*\\.).*)"],
};
