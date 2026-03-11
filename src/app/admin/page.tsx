import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { users, products } from "@/lib/db/schema";
import { getAllProducts, getDashboardStats, getRecentLogs } from "@/lib/queries/products";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminTabs } from "@/components/admin-tabs";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import type { CommunityUser } from "@/components/admin-community-list";

export const metadata = {
  title: "Admin - Vibe Shit",
};

export default async function AdminPage() {
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const user = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user[0] || user[0].role !== "admin") redirect("/");

  const allProducts = await getAllProducts(db);

  const usersMap = new Map<string, string>();
  const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
  for (const u of allUsers) {
    usersMap.set(u.id, u.name ?? t.admin.anonymous);
  }

  const enrichedProducts = allProducts.map((p) => ({
    ...p,
    userName: usersMap.get(p.userId) ?? t.admin.anonymous,
  }));

  // Aggregate community data: users with at least 1 approved product
  const approvedProducts = allProducts.filter((p) => p.status === "approved");

  const userStats = new Map<
    string,
    { count: number; topName: string | null; topShit: number }
  >();
  for (const p of approvedProducts) {
    const prev = userStats.get(p.userId);
    if (!prev) {
      userStats.set(p.userId, { count: 1, topName: p.name, topShit: p.shitCount });
    } else {
      prev.count++;
      if (p.shitCount > prev.topShit) {
        prev.topName = p.name;
        prev.topShit = p.shitCount;
      }
    }
  }

  const eligibleUserIds = Array.from(userStats.keys());
  let communityUsers: CommunityUser[] = [];

  if (eligibleUserIds.length > 0) {
    const eligibleUsers = await db
      .select({
        id: users.id,
        username: users.username,
        wechat: users.wechat,
        telegram: users.telegram,
        wechatInvited: users.wechatInvited,
        telegramInvited: users.telegramInvited,
      })
      .from(users)
      .where(
        sql`${users.id} IN (${sql.join(
          eligibleUserIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );

    communityUsers = eligibleUsers
      .map((u) => {
        const stats = userStats.get(u.id)!;
        return {
          id: u.id,
          username: u.username,
          wechat: u.wechat,
          telegram: u.telegram,
          wechatInvited: u.wechatInvited,
          telegramInvited: u.telegramInvited,
          productCount: stats.count,
          topProductName: stats.topName,
          topProductShitCount: stats.topShit,
        };
      })
      .sort((a, b) => b.productCount - a.productCount);
  }

  const [dashboardStats, dashboardLogs] = await Promise.all([
    getDashboardStats(db),
    getRecentLogs(db, 100),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-mono text-sm font-bold text-muted-foreground">
        {t.admin.title}
      </h1>
      <AdminTabs
        products={enrichedProducts}
        communityUsers={communityUsers}
        dashboardStats={dashboardStats}
        dashboardLogs={dashboardLogs}
      />
    </div>
  );
}
