import { desc, eq, sql, and, gte, lt, like, or } from "drizzle-orm";
import { products, votes, users, comments, sotd, eventLogs } from "@/lib/db/schema";
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
  images: string | null;
  githubUrl: string | null;
  agent: string | null;
  llm: string | null;
  tags: string | null;
  makerName: string | null;
  makerLink: string | null;
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

const productWithUserColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  tagline: products.tagline,
  description: products.description,
  url: products.url,
  logoUrl: products.logoUrl,
  bannerUrl: products.bannerUrl,
  images: products.images,
  githubUrl: products.githubUrl,
  agent: products.agent,
  llm: products.llm,
  tags: products.tags,
  makerName: products.makerName,
  makerLink: products.makerLink,
  userId: products.userId,
  launchDate: products.launchDate,
  shitCount: products.shitCount,
  status: products.status,
  createdAt: products.createdAt,
  userName: users.name,
  userUsername: users.username,
  userImage: users.image,
};

async function getUserVotes(db: Database, userId: string) {
  const rows = await db
    .select({ productId: votes.productId })
    .from(votes)
    .where(eq(votes.userId, userId));
  return new Set(rows.map((v) => v.productId));
}

export async function getProductsByDate(
  db: Database,
  currentUserId?: string,
  dateFilter?: string,
  filters?: { agent?: string; llm?: string; tag?: string }
) {
  const conditions = [eq(products.status, "approved")];
  if (dateFilter) conditions.push(eq(products.launchDate, dateFilter));

  const rows = await db
    .select(productWithUserColumns)
    .from(products)
    .leftJoin(users, eq(products.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(products.launchDate), desc(products.shitCount));

  const filtered = filters
    ? rows.filter((p) => matchesFilters(p, filters))
    : rows;

  const userVotes = currentUserId
    ? await getUserVotes(db, currentUserId)
    : new Set<string>();

  const enriched = filtered.map((p) => ({
    ...p,
    hasVoted: userVotes.has(p.id),
  }));

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
  productId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<{ comments: CommentWithUser[]; hasMore: boolean }> {
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
    .orderBy(comments.createdAt)
    .limit(limit + 1)
    .offset(offset);

  const hasMore = rows.length > limit;
  return {
    comments: hasMore ? rows.slice(0, limit) : rows,
    hasMore,
  };
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

  const rows = await db
    .select(productWithUserColumns)
    .from(products)
    .leftJoin(users, eq(products.userId, users.id))
    .where(eq(products.userId, user[0].id))
    .orderBy(desc(products.createdAt));

  const userVotes = currentUserId
    ? await getUserVotes(db, currentUserId)
    : new Set<string>();
  return rows.map((p) => ({ ...p, hasVoted: userVotes.has(p.id) }));
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
  const rows = await db
    .select(productWithUserColumns)
    .from(products)
    .leftJoin(users, eq(products.userId, users.id))
    .where(sql`${products.id} IN (${sql.join(
      productIds.map((id) => sql`${id}`),
      sql`, `
    )})`)
    .orderBy(desc(products.shitCount));

  const userVotes = currentUserId
    ? await getUserVotes(db, currentUserId)
    : new Set<string>();
  return rows.map((p) => ({ ...p, hasVoted: userVotes.has(p.id) }));
}

export async function getUserByUsername(db: Database, username: string) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return user[0] ?? null;
}

export async function updateUserProfile(
  db: Database,
  userId: string,
  data: {
    bio?: string | null;
    wechat?: string | null;
    showWechat?: boolean;
    twitterHandle?: string | null;
    telegram?: string | null;
    showTelegram?: boolean;
  }
) {
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function searchProducts(
  db: Database,
  query: string,
  currentUserId?: string
) {
  const q = `%${query}%`;
  const rows = await db
    .select(productWithUserColumns)
    .from(products)
    .leftJoin(users, eq(products.userId, users.id))
    .where(and(
      eq(products.status, "approved"),
      or(like(products.name, q), like(products.tagline, q))
    ))
    .orderBy(desc(products.shitCount))
    .limit(50);

  const userVotes = currentUserId
    ? await getUserVotes(db, currentUserId)
    : new Set<string>();
  return rows.map((p) => ({ ...p, hasVoted: userVotes.has(p.id) }));
}

export async function getTrendingProducts(
  db: Database,
  period: "week" | "month" | "all",
  currentUserId?: string,
  filters?: { agent?: string; llm?: string; tag?: string }
) {
  const now = new Date();
  const conditions = [eq(products.status, "approved")];

  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    conditions.push(gte(products.launchDate, d.toISOString().split("T")[0]));
  } else if (period === "month") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    conditions.push(gte(products.launchDate, d.toISOString().split("T")[0]));
  }

  const rows = await db
    .select(productWithUserColumns)
    .from(products)
    .leftJoin(users, eq(products.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(products.shitCount))
    .limit(50);

  const filtered = filters
    ? rows.filter((p) => matchesFilters(p, filters))
    : rows;

  const userVotes = currentUserId
    ? await getUserVotes(db, currentUserId)
    : new Set<string>();
  return filtered.map((p) => ({ ...p, hasVoted: userVotes.has(p.id) }));
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

// ============ SOTD (Shit of the Day) ============

export type SOTDResult = {
  date: string;
  productId: string;
  productName: string;
  productSlug: string;
  productTagline: string;
  productLogoUrl: string | null;
  voteCount: number;
  userName: string | null;
  userUsername: string | null;
} | null;

function getUTCDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getYesterdayUTC(): string {
  const now = new Date();
  const yesterday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - 1
  ));
  return getUTCDateString(yesterday);
}

function getTodayUTC(): string {
  const now = new Date();
  return getUTCDateString(new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )));
}

/**
 * Calculate the top voted product for a specific UTC date.
 * Counts votes where createdAt falls within [date 00:00, date+1 00:00) UTC.
 */
async function calculateSOTDForDate(db: Database, date: string) {
  const dayStart = `${date}T00:00:00.000Z`;
  const nextDay = new Date(date + "T00:00:00.000Z");
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const dayEnd = nextDay.toISOString();

  const results = await db
    .select({
      productId: votes.productId,
      voteCount: sql<number>`COUNT(*)`.as("voteCount"),
    })
    .from(votes)
    .where(
      and(
        gte(votes.createdAt, dayStart),
        lt(votes.createdAt, dayEnd)
      )
    )
    .groupBy(votes.productId)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(1);

  if (results.length === 0) return null;

  return {
    productId: results[0].productId,
    voteCount: results[0].voteCount,
  };
}

/**
 * Settle (freeze) SOTD for a given date.
 * Calculates the winner and stores it in the sotd table.
 * Returns the settled result or null if no votes that day.
 */
export async function settleSOTD(db: Database, date: string) {
  const existing = await db
    .select()
    .from(sotd)
    .where(eq(sotd.date, date))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const winner = await calculateSOTDForDate(db, date);
  if (!winner) return null;

  const result = await db
    .insert(sotd)
    .values({
      date,
      productId: winner.productId,
      voteCount: winner.voteCount,
    })
    .returning();

  return result[0] ?? null;
}

/**
 * Get the current SOTD to display.
 * Strategy: lazy settlement — on first access after midnight,
 * automatically settles yesterday's SOTD.
 * Returns yesterday's SOTD (the most recent settled one).
 */
export async function getSOTD(db: Database): Promise<SOTDResult> {
  const yesterday = getYesterdayUTC();

  // Lazy settle: ensure yesterday is settled
  await settleSOTD(db, yesterday);

  // Get the most recent SOTD
  const result = await db
    .select({
      date: sotd.date,
      productId: sotd.productId,
      voteCount: sotd.voteCount,
      productName: products.name,
      productSlug: products.slug,
      productTagline: products.tagline,
      productLogoUrl: products.logoUrl,
      userName: users.name,
      userUsername: users.username,
    })
    .from(sotd)
    .innerJoin(products, eq(sotd.productId, products.id))
    .innerJoin(users, eq(products.userId, users.id))
    .orderBy(desc(sotd.date))
    .limit(1);

  if (result.length === 0) return null;

  return result[0];
}

/**
 * Get today's live leaderboard (real-time, not settled yet).
 * Shows current top product for today.
 */
export async function getTodayLiveLeader(db: Database): Promise<{
  productId: string;
  productName: string;
  productSlug: string;
  productLogoUrl: string | null;
  voteCount: number;
} | null> {
  const today = getTodayUTC();
  const dayStart = `${today}T00:00:00.000Z`;

  const results = await db
    .select({
      productId: votes.productId,
      voteCount: sql<number>`COUNT(*)`.as("voteCount"),
    })
    .from(votes)
    .where(gte(votes.createdAt, dayStart))
    .groupBy(votes.productId)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(1);

  if (results.length === 0) return null;

  const product = await db
    .select({
      name: products.name,
      slug: products.slug,
      logoUrl: products.logoUrl,
    })
    .from(products)
    .where(eq(products.id, results[0].productId))
    .limit(1);

  if (product.length === 0) return null;

  return {
    productId: results[0].productId,
    productName: product[0].name,
    productSlug: product[0].slug,
    productLogoUrl: product[0].logoUrl,
    voteCount: results[0].voteCount,
  };
}

// ============ Admin Dashboard ============

export type EventLog = {
  id: string;
  type: string;
  level: string;
  message: string;
  metadata: string | null;
  userId: string | null;
  createdAt: string;
};

export type DashboardStats = {
  totalProducts: number;
  totalUsers: number;
  totalVotes: number;
  totalComments: number;
  todaySubmissions: number;
  todayVotes: number;
};

export async function getDashboardStats(db: Database): Promise<DashboardStats> {
  const today = new Date().toISOString().split("T")[0];

  const [productCount, userCount, voteCount, commentCount, todaySubs, todayVotes] =
    await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(products),
      db.select({ count: sql<number>`COUNT(*)` }).from(users),
      db.select({ count: sql<number>`COUNT(*)` }).from(votes),
      db.select({ count: sql<number>`COUNT(*)` }).from(comments),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(products)
        .where(eq(products.launchDate, today)),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(votes)
        .where(gte(votes.createdAt, `${today}T00:00:00.000Z`)),
    ]);

  return {
    totalProducts: productCount[0].count,
    totalUsers: userCount[0].count,
    totalVotes: voteCount[0].count,
    totalComments: commentCount[0].count,
    todaySubmissions: todaySubs[0].count,
    todayVotes: todayVotes[0].count,
  };
}

export async function getRecentLogs(
  db: Database,
  limit: number = 50,
  levelFilter?: string
): Promise<EventLog[]> {
  const conditions = levelFilter ? [eq(eventLogs.level, levelFilter)] : [];
  return db
    .select()
    .from(eventLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(eventLogs.createdAt))
    .limit(limit);
}
