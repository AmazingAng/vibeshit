import { NextResponse } from "next/server";
import { LOCALE_COOKIE_NAME, type AppLocale } from "@/lib/i18n";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { locale?: AppLocale };
    const locale = body.locale === "zh" ? "zh" : "en";
    const isSecure = new URL(request.url).protocol === "https:";

    const response = NextResponse.json({ ok: true });
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: isSecure,
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
