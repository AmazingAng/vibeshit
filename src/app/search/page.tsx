import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { searchProducts } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const session = await auth();
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const results = q ? await searchProducts(db, q, session?.user?.id) : [];

  return (
    <div>
      <h1 className="font-mono text-sm font-bold text-muted-foreground">
        {q ? `Search results for "${q}"` : "Search"}
      </h1>

      {q && results.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No results found for &quot;{q}&quot;
        </p>
      )}

      {results.length > 0 && (
        <div className="divide-y divide-border">
          {results.map((product, idx) => (
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
