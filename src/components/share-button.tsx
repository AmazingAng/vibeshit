"use client";

interface ShareButtonProps {
  productName: string;
  productTagline: string;
  productSlug: string;
  variant?: "default" | "compact";
}

export function ShareButton({
  productName,
  productTagline,
  productSlug,
  variant = "default",
}: ShareButtonProps) {
  const url = `https://vibeshit.org/product/${productSlug}`;
  const text = `${productName} - ${productTagline}\n\nCheck it out on Vibe Shit 💩`;

  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

  if (variant === "compact") {
    return (
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Share on X"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
    );
  }

  return (
    <a
      href={twitterUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted"
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Share
    </a>
  );
}
