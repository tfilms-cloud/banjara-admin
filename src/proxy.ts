import { NextResponse, type NextRequest } from "next/server";

/**
 * Sends signed-out visitors to the right sign-in page before an admin, provider or
 * account page is rendered, so they never download and boot that area's shell.
 *
 * This is a convenience and a first filter, NOT the security boundary. It reads the
 * non-secret "signed in" flag cookie (see lib/token-session.ts), which anyone could
 * set. Every request for actual data is still authenticated and authorised by the API.
 */
const ADMIN_FLAG = "banjara_admin_signed_in";
const SITE_FLAG = "banjara_site_signed_in";

function signedIn(request: NextRequest, flag: string) {
  return request.cookies.get(flag)?.value === "1";
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login" || signedIn(request, ADMIN_FLAG)) return NextResponse.next();
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Provider area, the provider application, and the traveller's own account pages.
  if (signedIn(request, SITE_FLAG)) return NextResponse.next();
  const login = new URL("/login", request.url);
  // /account pages are valid return targets (lib/auth-redirect.ts); provider pages
  // are chosen after sign-in from the account itself.
  if (pathname.startsWith("/account")) login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/provider",
    "/provider/:path*",
    "/provider-application",
    "/provider-application/:path*",
    "/account",
    "/account/:path*",
  ],
};
