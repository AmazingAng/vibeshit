import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/search-box";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { getMessages, type AppLocale } from "@/lib/i18n";

export async function Nav({ locale }: { locale: AppLocale }) {
  const session = await auth();
  const t = getMessages(locale);

  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-mono text-lg font-bold tracking-tight">
            <img src="/logo-256.png" alt="Vibe Shit" className="h-8 w-8" />
            <span className="hidden sm:inline">VIBE SHIT</span>
          </Link>
          <Link
            href="/trending"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t.common.trending}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <SearchBox />
          <LanguageSwitcher />
          <ThemeToggle />
          {session?.user ? (
            <>
              <NotificationBell />
              <Link href="/submit">
                <Button size="sm" className="font-mono text-xs">
                  {t.common.submit}
                </Button>
              </Link>
              <UserMenu
                locale={locale}
                userUsername={session.user.username ?? session.user.id!}
                userName={session.user.name ?? null}
                userImage={session.user.image ?? null}
                signOutAction={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              />
            </>
          ) : (
            <>
              <form
                action={async () => {
                  "use server";
                  await signIn("github", { redirectTo: "/submit" });
                }}
              >
                <Button type="submit" size="sm" className="font-mono text-xs">
                  {t.common.submit}
                </Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await signIn("github");
                }}
              >
                <Button type="submit" variant="outline" size="sm" className="font-mono text-xs">
                  {t.common.signIn}
                </Button>
              </form>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
