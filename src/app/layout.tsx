import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo-256.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-256.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <Nav />
          <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
          <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
            <p className="inline-flex items-center gap-1.5 font-mono">
              <img src="/logo-256.png" alt="" className="inline h-4 w-4" />
              vibe shit &middot; for vibe coders
            </p>
          </footer>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
