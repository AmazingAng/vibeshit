import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { getProductsByDate } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { Separator } from "@/components/ui/separator";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ date?: string }>;
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
  const { date: dateFilter } = await searchParams;
  const session = await auth();
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const groups = await getProductsByDate(db, session?.user?.id, dateFilter);
  const today = new Date().toISOString().split("T")[0];
  const isFiltered = !!dateFilter;

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

      {groups.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-6xl">💩</p>
          <h2 className="mt-4 font-mono text-lg font-bold">No shit yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isFiltered
              ? "No products launched on this day."
              : "Be the first to submit a vibe coding project."}
          </p>
          {isFiltered && (
            <Link
              href="/"
              className="mt-4 inline-block rounded-md border border-border px-4 py-2 font-mono text-xs transition-colors hover:bg-muted"
            >
              Back to today
            </Link>
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
