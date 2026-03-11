import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function NotFound() {
  const locale = await getRequestLocale();
  const t = getMessages(locale);

  return (
    <div className="py-20 text-center">
      <p className="text-6xl">💩</p>
      <h2 className="mt-4 font-mono text-xl font-bold">{t.notFound.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t.notFound.description}
      </p>
      <Link href="/" className="mt-6 inline-block">
        <Button variant="outline" className="font-mono text-xs">
          {t.notFound.backHome}
        </Button>
      </Link>
    </div>
  );
}
