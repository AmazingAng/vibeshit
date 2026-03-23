import { auth, signIn } from "@/auth";
import { getDb } from "@/lib/db";
import { getProductsByDate, getFilterOptions } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { FilterBar } from "@/components/filter-bar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

type Props = {
  searchParams: Promise<{ date?: string; agent?: string; llm?: string; tag?: string }>;
};

function formatDate(dateStr: string, locale: "en" | "zh", labels: { today: string; yesterday: string }) {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const target = new Date(dateStr + "T00:00:00");
  if (target.getTime() === today.getTime()) return labels.today;
  if (target.getTime() === yesterday.getTime()) return labels.yesterday;

  return date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function getAdjacentDate(dateStr: string, offset: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

export default async function Home({ searchParams }: Props) {
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  const { date: dateFilter, agent, llm, tag } = await searchParams;
  const session = await auth();
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const filters = (agent || llm || tag) ? { agent, llm, tag } : undefined;
  const [groups, filterOptions] = await Promise.all([
    getProductsByDate(db, session?.user?.id, dateFilter, filters),
    getFilterOptions(db),
  ]);

  const today = new Date().toISOString().split("T")[0];
  const isFiltered = !!dateFilter;
  const hasFilterActive = !!(agent || llm || tag);

  return (
    <div>
      {isFiltered && (
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/?date=${getAdjacentDate(dateFilter!, -1)}`}
            className="rounded-md border border-border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted"
          >
            {t.home.prev}
          </Link>
          <span className="font-mono text-sm font-bold">
            {formatDate(dateFilter!, locale, { today: t.home.today, yesterday: t.home.yesterday })}
          </span>
          <div className="flex gap-2">
            {dateFilter !== today && (
              <Link
                href="/"
                className="rounded-md border border-border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted"
              >
                {t.home.today}
              </Link>
            )}
            <Link
              href={`/?date=${getAdjacentDate(dateFilter!, 1)}`}
              className="rounded-md border border-border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted"
            >
              {t.home.next}
            </Link>
          </div>
        </div>
      )}

      <FilterBar
        agents={filterOptions.agents}
        llms={filterOptions.llms}
      />

      {groups.length === 0 ? (
        <div className="py-16 text-center">
          <img src="/logo-256.png" alt="" className="mx-auto h-20 w-20" />
          <h2 className="mt-6 font-mono text-xl font-bold">
            {hasFilterActive
              ? t.home.noMatching
              : isFiltered
                ? t.home.noOnDay
                : t.home.noYet}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            {hasFilterActive
              ? t.home.adjustFilters
              : isFiltered
                ? t.home.noLaunchOnDay
                : t.home.intro}
          </p>
          {hasFilterActive ? null : isFiltered ? (
            <Link
              href="/"
              className="mt-6 inline-block rounded-md border border-border px-4 py-2 font-mono text-xs transition-colors hover:bg-muted"
            >
              {t.home.backToToday}
            </Link>
          ) : session?.user ? (
            <Link href="/submit" className="mt-6 inline-block">
              <Button size="lg" className="font-mono text-sm">
                {t.home.submitCta}
              </Button>
            </Link>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/submit" });
              }}
              className="mt-6 inline-block"
            >
              <Button type="submit" size="lg" className="font-mono text-sm">
                {t.home.signInSubmitCta}
              </Button>
            </form>
          )}
        </div>
      ) : (
        groups.map((group, i) => (
          <section key={group.date}>
            {i > 0 && <Separator className="my-2" />}
            <div className="sticky top-0 z-10 bg-background/80 py-3 backdrop-blur-sm">
              <Link
                href={`/?date=${group.date}`}
                className="font-mono text-sm font-bold text-muted-foreground hover:underline"
              >
                {formatDate(group.date, locale, { today: t.home.today, yesterday: t.home.yesterday })}
              </Link>
            </div>
            <div className="divide-y divide-border">
              {group.products.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isAuthenticated={!!session?.user}
                  rank={idx + 1}
                  locale={locale}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
