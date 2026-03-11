"use client";

import { deleteProduct } from "@/lib/actions/product";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

export function ProductActions({ slug }: { slug: string }) {
  const { messages } = useI18n();
  const handleDelete = async () => {
    if (!confirm(messages.actions.deleteProductConfirm)) return;
    await deleteProduct(slug);
  };

  return (
    <>
      <Link
        href={`/product/${slug}/edit`}
        className="rounded-md border border-border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted"
      >
        {messages.actions.edit}
      </Link>
      <button
        onClick={handleDelete}
        className="rounded-md border border-destructive/50 px-3 py-1.5 font-mono text-xs text-destructive transition-colors hover:bg-destructive/10"
      >
        {messages.actions.delete}
      </button>
    </>
  );
}
