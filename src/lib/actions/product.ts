"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { products, votes, comments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const submitSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  tagline: z.string().min(1, "Tagline is required").max(120),
  description: z.string().max(2000).optional(),
  url: z.string().url("Invalid URL"),
  logoUrl: z.string().url("Invalid logo URL").optional().or(z.literal("")),
  githubUrl: z
    .string()
    .url("Invalid GitHub URL")
    .optional()
    .or(z.literal("")),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function submitProduct(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const raw = {
    name: formData.get("name") as string,
    tagline: formData.get("tagline") as string,
    description: (formData.get("description") as string) || undefined,
    url: formData.get("url") as string,
    logoUrl: (formData.get("logoUrl") as string) || "",
    githubUrl: (formData.get("githubUrl") as string) || "",
  };

  const result = submitSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const data = result.data;
  let slug = slugify(data.name);

  const existing = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const today = new Date().toISOString().split("T")[0];

  await db.insert(products).values({
    name: data.name,
    slug,
    tagline: data.tagline,
    description: data.description || null,
    url: data.url,
    logoUrl: data.logoUrl || null,
    githubUrl: data.githubUrl || null,
    userId: session.user.id,
    launchDate: today,
  });

  redirect(`/product/${slug}`);
}

export async function updateProduct(slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });
  if (!product) return { error: "Product not found" };
  if (product.userId !== session.user.id) return { error: "Not authorized" };

  const raw = {
    name: formData.get("name") as string,
    tagline: formData.get("tagline") as string,
    description: (formData.get("description") as string) || undefined,
    url: formData.get("url") as string,
    logoUrl: (formData.get("logoUrl") as string) || "",
    githubUrl: (formData.get("githubUrl") as string) || "",
  };

  const result = submitSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const data = result.data;

  await db
    .update(products)
    .set({
      name: data.name,
      tagline: data.tagline,
      description: data.description || null,
      url: data.url,
      logoUrl: data.logoUrl || null,
      githubUrl: data.githubUrl || null,
    })
    .where(eq(products.slug, slug));

  revalidatePath(`/product/${slug}`);
  revalidatePath("/");
  redirect(`/product/${slug}`);
}

export async function deleteProduct(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });
  if (!product) return { error: "Product not found" };
  if (product.userId !== session.user.id) return { error: "Not authorized" };

  await db.delete(comments).where(eq(comments.productId, product.id));
  await db.delete(votes).where(eq(votes.productId, product.id));
  await db.delete(products).where(eq(products.id, product.id));

  revalidatePath("/");
  redirect("/");
}

export async function updateProductStatus(
  productId: string,
  status: "approved" | "rejected"
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const { users } = await import("@/lib/db/schema");
  const user = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user[0] || user[0].role !== "admin") {
    return { error: "Not authorized" };
  }

  await db.update(products).set({ status }).where(eq(products.id, productId));
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}
