import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { getProductBySlug, getCommentsByProductId } from "@/lib/queries/products";
import { ShitButton } from "@/components/shit-button";
import { ShareButton } from "@/components/share-button";
import { CommentSection } from "@/components/comment-section";
import { ProductActions } from "@/components/product-actions";
import { Separator } from "@/components/ui/separator";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const product = await getProductBySlug(db, slug);

  if (!product) return { title: "Not Found" };

  const bannerAbsoluteUrl = product.bannerUrl
    ? product.bannerUrl.startsWith("/")
      ? `https://vibeshit.org${product.bannerUrl}`
      : product.bannerUrl
    : null;

  const images = bannerAbsoluteUrl
    ? [{ url: bannerAbsoluteUrl, width: 1200, height: 630 }]
    : [];

  return {
    title: `${product.name} - Vibe Shit`,
    description: product.tagline,
    openGraph: {
      title: `${product.name} - Vibe Shit`,
      description: product.tagline,
      type: "website",
      url: `https://vibeshit.org/product/${slug}`,
      ...(images.length > 0 && { images }),
    },
    twitter: {
      card: bannerAbsoluteUrl ? "summary_large_image" : "summary",
      title: `${product.name} - Vibe Shit`,
      description: product.tagline,
      ...(bannerAbsoluteUrl && { images: [bannerAbsoluteUrl] }),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const product = await getProductBySlug(db, slug, session?.user?.id);
  if (!product) notFound();

  const productComments = await getCommentsByProductId(db, product.id);
  const isOwner = session?.user?.id === product.userId;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start gap-6">
        {product.logoUrl ? (
          <img
            src={product.logoUrl}
            alt={product.name}
            className="h-20 w-20 shrink-0 rounded-xl border border-border object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-border bg-muted font-mono text-3xl font-bold text-muted-foreground">
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="mt-1 text-muted-foreground">{product.tagline}</p>
          <div className="mt-3 flex items-center gap-3">
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted"
            >
              Visit &rarr;
            </a>
            {product.githubUrl && (
              <a
                href={product.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted"
              >
                GitHub
              </a>
            )}
            <ShareButton
              productName={product.name}
              productTagline={product.tagline}
              productSlug={slug}
            />
            {isOwner && <ProductActions slug={slug} />}
          </div>
        </div>

        <ShitButton
          productId={product.id}
          initialCount={product.shitCount}
          initialVoted={product.hasVoted}
          isAuthenticated={!!session?.user}
        />
      </div>

      {product.bannerUrl && (
        <div className="mt-8">
          <img
            src={product.bannerUrl}
            alt={`${product.name} banner`}
            className="w-full rounded-xl border border-border object-cover"
            style={{ aspectRatio: "1200/630" }}
          />
        </div>
      )}

      {(product.agent || product.llm || product.tags) && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {product.agent && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 font-mono text-xs">
              <span className="text-muted-foreground">Agent:</span> {product.agent}
            </span>
          )}
          {product.llm && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 font-mono text-xs">
              <span className="text-muted-foreground">LLM:</span> {product.llm}
            </span>
          )}
          {product.tags &&
            (JSON.parse(product.tags) as string[]).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs text-primary"
              >
                #{tag}
              </span>
            ))}
        </div>
      )}

      <Separator className="my-8" />

      {product.description && (
        <>
          <div className="prose prose-sm max-w-none text-foreground">
            <p className="whitespace-pre-wrap">{product.description}</p>
          </div>
          <Separator className="my-8" />
        </>
      )}

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {product.userImage && product.userUsername && (
          <Link href={`/user/${product.userUsername}`}>
            <img
              src={product.userImage}
              alt={product.userName ?? ""}
              className="h-6 w-6 rounded-full"
            />
          </Link>
        )}
        <span>
          Submitted by{" "}
          {product.userUsername ? (
            <Link
              href={`/user/${product.userUsername}`}
              className="font-medium text-foreground hover:underline"
            >
              @{product.userUsername}
            </Link>
          ) : (
            <span className="font-medium text-foreground">
              {product.userName ?? "Anonymous"}
            </span>
          )}
        </span>
        <span>&middot;</span>
        <span>{new Date(product.createdAt).toLocaleDateString()}</span>
      </div>

      <Separator className="my-8" />

      <CommentSection
        productId={product.id}
        comments={productComments}
        isAuthenticated={!!session?.user}
        currentUserId={session?.user?.id}
        currentUserUsername={session?.user?.username}
      />
    </div>
  );
}
