import Link from "next/link";
import { ShitButton } from "./shit-button";
import type { ProductWithVote } from "@/lib/queries/products";

interface ProductCardProps {
  product: ProductWithVote;
  isAuthenticated: boolean;
  rank: number;
}

export function ProductCard({ product, isAuthenticated, rank }: ProductCardProps) {
  return (
    <div className="group flex items-center gap-3 py-4 sm:gap-4">
      <span className="hidden w-6 text-right font-mono text-sm text-muted-foreground sm:block">
        {rank}
      </span>

      <Link
        href={`/product/${product.slug}`}
        className="flex flex-1 items-center gap-3 min-w-0"
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
        </div>
      </Link>

      <ShitButton
        productId={product.id}
        initialCount={product.shitCount}
        initialVoted={product.hasVoted}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
