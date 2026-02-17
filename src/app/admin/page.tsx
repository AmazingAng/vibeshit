import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { users, products } from "@/lib/db/schema";
import { getAllProducts } from "@/lib/queries/products";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminProductList } from "@/components/admin-product-list";

export const metadata = {
  title: "Admin - Vibe Shit",
};

export default async function AdminPage() {
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
    usersMap.set(u.id, u.name ?? "Anonymous");
  }

  const enriched = allProducts.map((p) => ({
    ...p,
    userName: usersMap.get(p.userId) ?? "Anonymous",
  }));

  return (
    <div>
      <h1 className="mb-6 font-mono text-sm font-bold text-muted-foreground">
        Admin — Products ({allProducts.length})
      </h1>
      <AdminProductList products={enriched} />
    </div>
  );
}
