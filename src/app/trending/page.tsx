import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { getTrendingProducts, getFilterOptions } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { FilterBar } from "@/components/filter-bar";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ period?: string; agent?: string; llm?: string; tag?: string }>;
};

export const metadata = {
  title: "Trending - Vibe Shit",
};

export default async function TrendingPage({ searchParams }: Props) {
  const { period: rawPeriod, agent, llm, tag } = await searchParams;
  const period = (rawPeriod === "week" || rawPeriod === "month" || rawPeriod === "all")
    ? rawPeriod
    : "week";

  const session = await auth();
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const filters = (agent || llm || tag) ? { agent, llm, tag } : undefined;
  const [products, filterOptions] = await Promise.all([
    getTrendingProducts(db, period, session?.user?.id, filters),
    getFilterOptions(db),
  ]);

  const tabs = [
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-sm font-bold text-muted-foreground">
          Trending
        </h1>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={`/trending?period=${tab.value}`}
              className={cn(
                "rounded-md px-3 py-1.5 font-mono text-xs transition-colors",
                period === tab.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <FilterBar
          agents={filterOptions.agents}
          llms={filterOptions.llms}
          tags={filterOptions.tags}
        />
      </div>

      {products.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {(agent || llm || tag)
            ? "No products match the current filters."
            : "No trending products yet."}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {products.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              isAuthenticated={!!session?.user}
              rank={idx + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
