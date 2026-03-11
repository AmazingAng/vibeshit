import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { getUserByUsername, getProductsByUser, getVotedProducts } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { Separator } from "@/components/ui/separator";
import { UserProfileEditor } from "@/components/user-profile-editor";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Twitter, MessageCircle, AtSign, Github } from "lucide-react";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  const { username } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const user = await getUserByUsername(db, username);
  if (!user) return { title: t.user.userNotFound };
  return { title: `${user.name ?? user.username ?? t.user.userDefault} (@${username}) - Vibe Shit` };
}

export default async function UserPage({ params }: Props) {
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  const { username } = await params;
  const session = await auth();
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const user = await getUserByUsername(db, username);
  if (!user) notFound();

  const isOwner = session?.user?.id === user.id;
  const userProducts = await getProductsByUser(db, username, session?.user?.id);
  const votedProducts = await getVotedProducts(db, username, session?.user?.id);

  const { bio, wechat, showWechat, twitterHandle, telegram, showTelegram } = user;

  // GitHub username is stored in user.username (set on OAuth sign-in)
  const githubUsername = user.username;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start gap-4">
        {user.image && (
          <img
            src={user.image}
            alt={user.name ?? ""}
            className="h-16 w-16 shrink-0 rounded-full border border-border"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h1 className="text-xl font-bold">{user.name ?? t.user.anonymous}</h1>
              {githubUsername && (
                <p className="text-sm text-muted-foreground">@{githubUsername}</p>
              )}
            </div>
            {isOwner && (
              <UserProfileEditor
                initial={{
                  bio,
                  wechat,
                  showWechat: showWechat ?? false,
                  twitterHandle,
                  telegram,
                  showTelegram: showTelegram ?? false,
                }}
              />
            )}
          </div>

          {bio && (
            <p className="mt-2 text-sm text-muted-foreground">{bio}</p>
          )}

          {/* Social links */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* GitHub — always shown */}
            {githubUsername && (
              <a
                href={`https://github.com/${githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-3.5 w-3.5" />
                {githubUsername}
              </a>
            )}

            {/* Twitter — always shown if set */}
            {twitterHandle && (
              <a
                href={`https://x.com/${twitterHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="h-3.5 w-3.5" />
                @{twitterHandle}
              </a>
            )}

            {/* Telegram — only shown if user opted in */}
            {telegram && (isOwner || showTelegram) && (
              <a
                href={`https://t.me/${telegram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                @{telegram}
                {isOwner && !showTelegram && (
                  <span className="text-xs text-muted-foreground/50">{t.user.onlyYou}</span>
                )}
              </a>
            )}

            {/* WeChat — only shown if user opted in */}
            {wechat && (isOwner || showWechat) && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <AtSign className="h-3.5 w-3.5" />
                {wechat}
                {isOwner && !showWechat && (
                  <span className="text-xs text-muted-foreground/50">{t.user.onlyYou}</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      <section>
        <h2 className="font-mono text-sm font-bold text-muted-foreground">
          {t.user.submitted} ({userProducts.length})
        </h2>
        {userProducts.length > 0 ? (
          <div className="divide-y divide-border">
            {userProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                isAuthenticated={!!session?.user}
                rank={idx + 1}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{t.user.noSubmitted}</p>
        )}
      </section>

      <Separator className="my-8" />

      <section>
        <h2 className="font-mono text-sm font-bold text-muted-foreground">
          {t.user.shitted} ({votedProducts.length})
        </h2>
        {votedProducts.length > 0 ? (
          <div className="divide-y divide-border">
            {votedProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                isAuthenticated={!!session?.user}
                rank={idx + 1}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{t.user.noShitted}</p>
        )}
      </section>
    </div>
  );
}
