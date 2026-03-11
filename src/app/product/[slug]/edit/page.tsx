import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { getProductBySlug } from "@/lib/queries/products";
import { EditForm } from "@/components/edit-form";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notFound, redirect } from "next/navigation";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const product = await getProductBySlug(db, slug);

  if (!product) notFound();
  if (product.userId !== session.user.id) redirect(`/product/${slug}`);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold">{t.editPage.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.editPage.subtitle}
        </p>
      </div>
      <EditForm slug={slug} product={product} />
    </div>
  );
}
