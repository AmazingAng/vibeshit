import { auth, signIn } from "@/auth";
import { getDb } from "@/lib/db";
import { getProductsByDate, getFilterOptions } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { FilterBar } from "@/components/filter-bar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ date?: string; agent?: string; llm?: string; tag?: string }>;
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const target = new Date(dateStr + "T00:00:00");
  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
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
            &larr; Prev
          </Link>
          <span className="font-mono text-sm font-bold">
            {formatDate(dateFilter!)}
          </span>
          <div className="flex gap-2">
            {dateFilter !== today && (
              <Link
                href="/"
                className="rounded-md border border-border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted"
              >
                Today
              </Link>
            )}
            <Link
              href={`/?date=${getAdjacentDate(dateFilter!, 1)}`}
              className="rounded-md border border-border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted"
            >
              Next &rarr;
            </Link>
          </div>
        </div>
      )}

      <FilterBar
        agents={filterOptions.agents}
        llms={filterOptions.llms}
        tags={filterOptions.tags}
      />

      {groups.length === 0 ? (
        <div className="py-16 text-center">
          <img src="/logo-256.png" alt="" className="mx-auto h-20 w-20" />
          <h2 className="mt-6 font-mono text-xl font-bold">
            {hasFilterActive
              ? "No matching shit"
              : isFiltered
                ? "No shit on this day"
                : "No shit yet"}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            {hasFilterActive
              ? "Try adjusting your filters or clearing them."
              : isFiltered
                ? "No products were launched on this day."
                : "Vibeshit is where vibe coders share what they built. Submit your project, tell us which agent & LLM you used, and let the community give it a 💩."}
          </p>
          {hasFilterActive ? null : isFiltered ? (
            <Link
              href="/"
              className="mt-6 inline-block rounded-md border border-border px-4 py-2 font-mono text-xs transition-colors hover:bg-muted"
            >
              Back to today
            </Link>
          ) : session?.user ? (
            <Link href="/submit" className="mt-6 inline-block">
              <Button size="lg" className="font-mono text-sm">
                Submit your shit &rarr;
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
                Sign in & submit your shit &rarr;
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
                {formatDate(group.date)}
              </Link>
            </div>
            <div className="divide-y divide-border">
              {group.products.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isAuthenticated={!!session?.user}
                  rank={idx + 1}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
