"use client";

import { updateProductStatus } from "@/lib/actions/product";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  slug: string;
  status: string;
  shitCount: number;
  launchDate: string;
  userName: string;
};

export function AdminProductList({ products }: { products: Product[] }) {
  const handleStatus = async (productId: string, status: "approved" | "rejected") => {
    await updateProductStatus(productId, status);
  };

  return (
    <div className="space-y-2">
      {products.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between rounded-lg border border-border p-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{p.name}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[10px]",
                  p.status === "approved" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                  p.status === "pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                  p.status === "rejected" && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                )}
              >
                {p.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              by {p.userName} &middot; {p.launchDate} &middot; 💩 {p.shitCount}
            </p>
          </div>
          <div className="flex gap-1">
            {p.status !== "approved" && (
              <button
                onClick={() => handleStatus(p.id, "approved")}
                className="rounded-md border border-border px-2 py-1 font-mono text-[10px] transition-colors hover:bg-muted"
              >
                Approve
              </button>
            )}
            {p.status !== "rejected" && (
              <button
                onClick={() => handleStatus(p.id, "rejected")}
                className="rounded-md border border-destructive/50 px-2 py-1 font-mono text-[10px] text-destructive transition-colors hover:bg-destructive/10"
              >
                Reject
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
