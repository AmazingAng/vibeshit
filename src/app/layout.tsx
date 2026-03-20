import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Nav } from "@/components/nav";
import { SotdBanner } from "@/components/sotd-banner";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/components/i18n-provider";
import { NewsletterForm } from "@/components/newsletter-form";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import "./globals.css";

const appFontVars = {
  "--font-geist-sans": "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  "--font-geist-mono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
} as CSSProperties;

export const metadata: Metadata = {
  title: "Vibe Shit - Product Hunt for Vibe Coding",
  description: "Discover and share the best vibe coding projects. Give them a 💩.",
  metadataBase: new URL("https://vibeshit.org"),
  openGraph: {
    title: "Vibe Shit",
    description: "Product Hunt for Vibe Coding. Give projects a 💩.",
    type: "website",
    url: "https://vibeshit.org",
    images: [{ url: "https://vibeshit.org/logo-1024.png", width: 1024, height: 1024 }],
  },
  twitter: {
    card: "summary",
    title: "Vibe Shit",
    description: "Product Hunt for Vibe Coding. Give projects a 💩.",
    images: ["https://vibeshit.org/logo-1024.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo-256.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-256.png" />
      </head>
      <body className="font-sans antialiased" style={appFontVars}>
        <LocaleShell locale={locale}>{children}</LocaleShell>
      </body>
    </html>
  );
}

function LocaleShell({
  locale,
  children,
}: {
  locale: Awaited<ReturnType<typeof getRequestLocale>>;
  children: React.ReactNode;
}) {
  const messages = getMessages(locale);

  return (
    <I18nProvider initialLocale={locale}>
      <ThemeProvider>
        <Nav locale={locale} />
        <SotdBanner locale={locale} />
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
          <div className="mx-auto max-w-4xl px-4">
            <NewsletterForm />
            <p className="mt-6 inline-flex items-center gap-1.5 font-mono">
              <img src="/logo-256.png" alt="" className="inline h-4 w-4" />
              {messages.common.footerTagline}
            </p>
          </div>
        </footer>
        <Toaster />
      </ThemeProvider>
    </I18nProvider>
  );
}
