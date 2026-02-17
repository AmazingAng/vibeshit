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
  },
  twitter: {
    card: "summary",
    title: "Vibe Shit",
    description: "Product Hunt for Vibe Coding. Give projects a 💩.",
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
            <p className="font-mono">
              💩 vibe shit &middot; for vibe coders
            </p>
          </footer>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
