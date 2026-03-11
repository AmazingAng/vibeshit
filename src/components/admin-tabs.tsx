"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { AdminProductList } from "@/components/admin-product-list";
import { AdminCommunityList, type CommunityUser } from "@/components/admin-community-list";
import { AdminDashboard } from "@/components/admin-dashboard";
import { cn } from "@/lib/utils";
import type { DashboardStats, EventLog } from "@/lib/queries/products";

type Product = {
  id: string;
  name: string;
  slug: string;
  status: string;
  shitCount: number;
  launchDate: string;
  userName: string;
};

type Tab = "products" | "community" | "dashboard";
type CommunityPlatform = "wechat" | "telegram";

export function AdminTabs({
  products,
  communityUsers,
  dashboardStats,
  dashboardLogs,
}: {
  products: Product[];
  communityUsers: CommunityUser[];
  dashboardStats: DashboardStats;
  dashboardLogs: EventLog[];
}) {
  const { messages } = useI18n();
  const t = messages.admin;
  const [tab, setTab] = useState<Tab>("dashboard");
  const [platform, setPlatform] = useState<CommunityPlatform>("wechat");

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("dashboard")}
          className={cn(
            "px-3 py-2 font-mono text-xs transition-colors",
            tab === "dashboard"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t.tabDashboard}
        </button>
        <button
          onClick={() => setTab("products")}
          className={cn(
            "px-3 py-2 font-mono text-xs transition-colors",
            tab === "products"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t.tabProducts} ({products.length})
        </button>
        <button
          onClick={() => setTab("community")}
          className={cn(
            "px-3 py-2 font-mono text-xs transition-colors",
            tab === "community"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t.tabCommunity} ({communityUsers.length})
        </button>
      </div>

      {tab === "dashboard" && (
        <AdminDashboard stats={dashboardStats} logs={dashboardLogs} />
      )}

      {tab === "products" && <AdminProductList products={products} />}

      {tab === "community" && (
        <div>
          <div className="mb-3 flex gap-1">
            <button
              onClick={() => setPlatform("wechat")}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-[11px] transition-colors",
                platform === "wechat"
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {t.communityWechat}
            </button>
            <button
              onClick={() => setPlatform("telegram")}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-[11px] transition-colors",
                platform === "telegram"
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {t.communityTelegram}
            </button>
          </div>
          <AdminCommunityList key={platform} users={communityUsers} platform={platform} />
        </div>
      )}
    </div>
  );
}
