import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { searchProducts } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { formatTemplate, getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  const { q } = await searchParams;
  const session = await auth();
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const results = q ? await searchProducts(db, q, session?.user?.id) : [];

  return (
    <div>
      <h1 className="font-mono text-sm font-bold text-muted-foreground">
        {q ? formatTemplate(t.search.resultsFor, { q }) : t.search.title}
      </h1>

      {q && results.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {formatTemplate(t.search.noResults, { q })}
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
