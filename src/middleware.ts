import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.hostname === "www.vibeshit.org") {
    const url = req.nextUrl.clone();
    url.hostname = "vibeshit.org";
    url.host = "vibeshit.org";
    return NextResponse.redirect(url, 301);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-|robots.txt|sitemap.xml).*)"],
};
