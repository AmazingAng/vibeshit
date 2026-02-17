import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/search-box";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

export async function Nav() {
  const session = await auth();

  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-mono text-lg font-bold tracking-tight">
            <span className="text-2xl">💩</span>
            <span className="hidden sm:inline">VIBE SHIT</span>
          </Link>
          <Link
            href="/trending"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Trending
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <SearchBox />
          <ThemeToggle />
          {session?.user ? (
            <>
              <Link href="/submit">
                <Button variant="outline" size="sm" className="font-mono text-xs">
                  Submit
                </Button>
              </Link>
              <UserMenu
                userUsername={session.user.username ?? session.user.id!}
                userName={session.user.name ?? null}
                userImage={session.user.image ?? null}
                signOutAction={async () => {
                  "use server";
                  await signOut();
                }}
              />
            </>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("github");
              }}
            >
              <Button type="submit" variant="outline" size="sm" className="font-mono text-xs">
                Sign in
              </Button>
            </form>
          )}
        </div>
      </nav>
    </header>
  );
}
