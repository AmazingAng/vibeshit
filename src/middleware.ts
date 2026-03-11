import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { inferLocale, LOCALE_COOKIE_NAME } from "@/lib/i18n";

export function middleware(req: NextRequest) {
  const secureCookie = req.nextUrl.protocol === "https:";
  if (req.method === "GET" && req.nextUrl.pathname === "/api/auth/signin/github") {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.search = "";
    return NextResponse.redirect(url, 307);
  }

  const preferredLocale = inferLocale({
    cookieLocale: req.cookies.get(LOCALE_COOKIE_NAME)?.value ?? null,
    acceptLanguage: req.headers.get("accept-language"),
    country: req.headers.get("cf-ipcountry"),
  });

  if (req.nextUrl.hostname === "www.vibeshit.org") {
    const url = req.nextUrl.clone();
    url.hostname = "vibeshit.org";
    url.host = "vibeshit.org";
    const response = NextResponse.redirect(url, 301);
    if (!req.cookies.get(LOCALE_COOKIE_NAME)) {
      response.cookies.set(LOCALE_COOKIE_NAME, preferredLocale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        secure: secureCookie,
      });
    }
    return response;
  }

  const response = NextResponse.next();
  if (!req.cookies.get(LOCALE_COOKIE_NAME)) {
    response.cookies.set(LOCALE_COOKIE_NAME, preferredLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: secureCookie,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-|robots.txt|sitemap.xml).*)"],
};
