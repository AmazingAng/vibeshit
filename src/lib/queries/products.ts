import { desc, eq, sql, and, gte, like, or } from "drizzle-orm";
import { products, votes, users, comments } from "@/lib/db/schema";
import type { Database } from "@/lib/db";

export type ProductWithVote = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string | null;
  url: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  githubUrl: string | null;
  agent: string | null;
  llm: string | null;
  tags: string | null;
  userId: string;
  launchDate: string;
  shitCount: number;
  status: string;
  createdAt: string;
  hasVoted: boolean;
  userName: string | null;
  userUsername: string | null;
  userImage: string | null;
};

export type CommentWithUser = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  userName: string | null;
  userUsername: string | null;
  userImage: string | null;
};

async function getUsersMap(db: Database) {
  const allUsers = await db
    .select({ id: users.id, name: users.name, username: users.username, image: users.image })
    .from(users);
  const map = new Map<string, { name: string | null; username: string | null; image: string | null }>();
  for (const u of allUsers) {
    map.set(u.id, { name: u.name, username: u.username, image: u.image });
  }
  return map;
}

async function getUserVotes(db: Database, userId: string) {
  const rows = await db
    .select({ productId: votes.productId })
    .from(votes)
    .where(eq(votes.userId, userId));
  return new Set(rows.map((v) => v.productId));
}

function enrichProducts(
  rawProducts: (typeof products.$inferSelect)[],
  usersMap: Map<string, { name: string | null; username: string | null; image: string | null }>,
  userVotes: Set<string>
): ProductWithVote[] {
  return rawProducts.map((p) => {
    const user = usersMap.get(p.userId);
    return {
      ...p,
      hasVoted: userVotes.has(p.id),
      userName: user?.name ?? null,
      userUsername: user?.username ?? null,
      userImage: user?.image ?? null,
    };
  });
}

export async function getProductsByDate(
  db: Database,
  currentUserId?: string,
  dateFilter?: string,
  filters?: { agent?: string; llm?: string; tag?: string }
) {
  let query;
  if (dateFilter) {
    query = await db.query.products.findMany({
      where: and(
        eq(products.launchDate, dateFilter),
        eq(products.status, "approved")
      ),
      orderBy: [desc(products.shitCount)],
    });
  } else {
    query = await db.query.products.findMany({
      where: eq(products.status, "approved"),
      orderBy: [desc(products.launchDate), desc(products.shitCount)],
    });
  }

  const filtered = filters
    ? query.filter((p) => matchesFilters(p, filters))
    : query;

  const usersMap = await getUsersMap(db);
  const userVotes = currentUserId
    ? await getUserVotes(db, currentUserId)
    : new Set<string>();
  const enriched = enrichProducts(filtered, usersMap, userVotes);

  const grouped = new Map<string, ProductWithVote[]>();
  for (const p of enriched) {
    if (!grouped.has(p.launchDate)) grouped.set(p.launchDate, []);
    grouped.get(p.launchDate)!.push(p);
  }

  return Array.from(grouped.entries()).map(([date, items]) => ({
    date,
    products: items.sort((a, b) => b.shitCount - a.shitCount),
  }));
}

export async function getProductBySlug(
  db: Database,
  slug: string,
  currentUserId?: string
) {
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
  });

  if (!product) return null;

  const user = await db
    .select({ name: users.name, username: users.username, image: users.image })
    .from(users)
    .where(eq(users.id, product.userId))
    .limit(1);

  let hasVoted = false;
  if (currentUserId) {
    const vote = await db
      .select()
      .from(votes)
      .where(
        and(eq(votes.userId, currentUserId), eq(votes.productId, product.id))
      )
      .limit(1);
    hasVoted = vote.length > 0;
  }

  return {
    ...product,
    hasVoted,
    userName: user[0]?.name ?? null,
    userUsername: user[0]?.username ?? null,
    userImage: user[0]?.image ?? null,
  };
}

export async function getCommentsByProductId(
  db: Database,
  productId: string
): Promise<CommentWithUser[]> {
  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      userId: comments.userId,
      userName: users.name,
      userUsername: users.username,
      userImage: users.image,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.productId, productId))
    .orderBy(comments.createdAt);

  return rows;
}

export async function getProductsByUser(
  db: Database,
  username: string,
  currentUserId?: string
) {
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user[0]) return [];

  const rawProducts = await db.query.products.findMany({
    where: eq(products.userId, user[0].id),
    orderBy: [desc(products.createdAt)],
  });

  const usersMap = await getUsersMap(db);
  const userVotes = currentUserId
    ? await getUserVotes(db, currentUserId)
    : new Set<string>();
  return enrichProducts(rawProducts, usersMap, userVotes);
}

export async function getVotedProducts(
  db: Database,
  username: string,
  currentUserId?: string
) {
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user[0]) return [];

  const votedRows = await db
    .select({ productId: votes.productId })
    .from(votes)
    .where(eq(votes.userId, user[0].id));

  if (votedRows.length === 0) return [];

  const productIds = votedRows.map((v) => v.productId);
  const rawProducts = await db.query.products.findMany({
    where: sql`${products.id} IN (${sql.join(
      productIds.map((id) => sql`${id}`),
      sql`, `
    )})`,
    orderBy: [desc(products.shitCount)],
  });

  const usersMap = await getUsersMap(db);
  const userVotes = currentUserId
    ? await getUserVotes(db, currentUserId)
    : new Set<string>();
  return enrichProducts(rawProducts, usersMap, userVotes);
}

export async function getUserByUsername(db: Database, username: string) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return user[0] ?? null;
}

export async function searchProducts(
  db: Database,
  query: string,
  currentUserId?: string
) {
  const q = `%${query}%`;
  const rawProducts = await db.query.products.findMany({
    where: and(
      eq(products.status, "approved"),
      or(like(products.name, q), like(products.tagline, q))
    ),
    orderBy: [desc(products.shitCount)],
    limit: 50,
  });

  const usersMap = await getUsersMap(db);
  const userVotes = currentUserId
    ? await getUserVotes(db, currentUserId)
    : new Set<string>();
  return enrichProducts(rawProducts, usersMap, userVotes);
}

export async function getTrendingProducts(
  db: Database,
  period: "week" | "month" | "all",
  currentUserId?: string,
  filters?: { agent?: string; llm?: string; tag?: string }
) {
  const now = new Date();
  let dateFrom: string | null = null;
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    dateFrom = d.toISOString().split("T")[0];
  } else if (period === "month") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    dateFrom = d.toISOString().split("T")[0];
  }

  let rawProducts;
  if (dateFrom) {
    rawProducts = await db.query.products.findMany({
      where: and(
        eq(products.status, "approved"),
        gte(products.launchDate, dateFrom)
      ),
      orderBy: [desc(products.shitCount)],
      limit: 50,
    });
  } else {
    rawProducts = await db.query.products.findMany({
      where: eq(products.status, "approved"),
      orderBy: [desc(products.shitCount)],
      limit: 50,
    });
  }

  const filtered = filters
    ? rawProducts.filter((p) => matchesFilters(p, filters))
    : rawProducts;

  const usersMap = await getUsersMap(db);
  const userVotes = currentUserId
    ? await getUserVotes(db, currentUserId)
    : new Set<string>();
  return enrichProducts(filtered, usersMap, userVotes);
}

export async function getAllProducts(db: Database) {
  return db.query.products.findMany({
    orderBy: [desc(products.createdAt)],
  });
}

export type FilterOptions = {
  agents: string[];
  llms: string[];
  tags: string[];
};

export async function getFilterOptions(db: Database): Promise<FilterOptions> {
  const allProducts = await db
    .select({ agent: products.agent, llm: products.llm, tags: products.tags })
    .from(products)
    .where(eq(products.status, "approved"));

  const agentsSet = new Set<string>();
  const llmsSet = new Set<string>();
  const tagsSet = new Set<string>();

  for (const p of allProducts) {
    if (p.agent) agentsSet.add(p.agent);
    if (p.llm) llmsSet.add(p.llm);
    if (p.tags) {
      try {
        const arr = JSON.parse(p.tags) as string[];
        for (const t of arr) tagsSet.add(t);
      } catch {
        // ignore malformed JSON
      }
    }
  }

  return {
    agents: Array.from(agentsSet).sort(),
    llms: Array.from(llmsSet).sort(),
    tags: Array.from(tagsSet).sort(),
  };
}

function matchesFilters(
  product: { agent: string | null; llm: string | null; tags: string | null },
  filters: { agent?: string; llm?: string; tag?: string }
): boolean {
  if (filters.agent && product.agent !== filters.agent) return false;
  if (filters.llm && product.llm !== filters.llm) return false;
  if (filters.tag) {
    if (!product.tags) return false;
    try {
      const arr = JSON.parse(product.tags) as string[];
      if (!arr.includes(filters.tag)) return false;
    } catch {
      return false;
    }
  }
  return true;
}
