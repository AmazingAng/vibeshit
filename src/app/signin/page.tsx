import Link from "next/link";
import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

function normalizeCallbackUrl(raw: string | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

export default async function SignInPage({ searchParams }: Props) {
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  const { callbackUrl } = await searchParams;
  const safeCallbackUrl = normalizeCallbackUrl(callbackUrl);

  const session = await auth();
  if (session?.user) {
    redirect(safeCallbackUrl);
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
      <div className="w-full rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background">
          <img src="/logo-256.png" alt="" className="h-7 w-7" />
        </div>

        <h1 className="font-mono text-xl font-bold">{t.signInPage.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.signInPage.subtitle}</p>

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: safeCallbackUrl });
          }}
        >
          <Button type="submit" className="w-full font-mono">
            {t.signInPage.continueWithGithub}
          </Button>
        </form>

        <Link
          href="/"
          className="mt-3 inline-block font-mono text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {t.signInPage.backHome}
        </Link>
      </div>
    </div>
  );
}
