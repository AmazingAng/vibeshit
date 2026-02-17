"use client";

import { deleteProduct } from "@/lib/actions/product";
import Link from "next/link";

export function ProductActions({ slug }: { slug: string }) {
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product? This cannot be undone.")) return;
    await deleteProduct(slug);
  };

  return (
    <>
      <Link
        href={`/product/${slug}/edit`}
        className="rounded-md border border-border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted"
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        className="rounded-md border border-destructive/50 px-3 py-1.5 font-mono text-xs text-destructive transition-colors hover:bg-destructive/10"
      >
        Delete
      </button>
    </>
  );
}
