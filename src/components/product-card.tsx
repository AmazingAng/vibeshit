import Link from "next/link";
import { ShitButton } from "./shit-button";
import type { ProductWithVote } from "@/lib/queries/products";

interface ProductCardProps {
  product: ProductWithVote;
  isAuthenticated: boolean;
  rank: number;
}

export function ProductCard({ product, isAuthenticated, rank }: ProductCardProps) {
  const parsedTags: string[] = product.tags ? JSON.parse(product.tags) : [];
  const hasMeta = product.agent || product.llm || parsedTags.length > 0;

  return (
    <div className="group flex items-start gap-3 py-4 sm:gap-4">
      <span className="hidden w-6 pt-1 text-right font-mono text-sm text-muted-foreground sm:block">
        {rank}
      </span>

      <Link
        href={`/product/${product.slug}`}
        className="flex flex-1 items-start gap-3 min-w-0"
      >
        {product.logoUrl ? (
          <img
            src={product.logoUrl}
            alt={product.name}
            className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover sm:h-12 sm:w-12"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted font-mono text-base font-bold text-muted-foreground sm:h-12 sm:w-12 sm:text-lg">
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium group-hover:underline sm:text-base">
            {product.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">
            {product.tagline}
          </p>
          {hasMeta && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {product.agent && (
                <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {product.agent}
                </span>
              )}
              {product.llm && (
                <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {product.llm}
                </span>
              )}
              {parsedTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      <div className="pt-1">
        <ShitButton
          productId={product.id}
          initialCount={product.shitCount}
          initialVoted={product.hasVoted}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </div>
  );
}
