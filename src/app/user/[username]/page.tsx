import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { getUserByUsername, getProductsByUser, getVotedProducts } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { Separator } from "@/components/ui/separator";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const user = await getUserByUsername(db, username);
  if (!user) return { title: "User Not Found" };
  return { title: `${user.name ?? user.username ?? "User"} (@${username}) - Vibe Shit` };
}

export default async function UserPage({ params }: Props) {
  const { username } = await params;
  const session = await auth();
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const user = await getUserByUsername(db, username);
  if (!user) notFound();

  const userProducts = await getProductsByUser(db, username, session?.user?.id);
  const votedProducts = await getVotedProducts(db, username, session?.user?.id);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-4">
        {user.image && (
          <img
            src={user.image}
            alt={user.name ?? ""}
            className="h-16 w-16 rounded-full border border-border"
          />
        )}
        <div>
          <h1 className="text-xl font-bold">{user.name ?? "Anonymous"}</h1>
          {user.username && (
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      <section>
        <h2 className="font-mono text-sm font-bold text-muted-foreground">
          Submitted ({userProducts.length})
        </h2>
        {userProducts.length > 0 ? (
          <div className="divide-y divide-border">
            {userProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                isAuthenticated={!!session?.user}
                rank={idx + 1}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No products submitted yet.</p>
        )}
      </section>

      <Separator className="my-8" />

      <section>
        <h2 className="font-mono text-sm font-bold text-muted-foreground">
          Shitted ({votedProducts.length})
        </h2>
        {votedProducts.length > 0 ? (
          <div className="divide-y divide-border">
            {votedProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                isAuthenticated={!!session?.user}
                rank={idx + 1}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No shits given yet.</p>
        )}
      </section>
    </div>
  );
}
