import { cookies, headers } from "next/headers";
import { inferLocale, LOCALE_COOKIE_NAME, type AppLocale } from "@/lib/i18n";

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  return inferLocale({
    cookieLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? null,
    acceptLanguage: headerStore.get("accept-language"),
    country: headerStore.get("cf-ipcountry"),
  });
}
