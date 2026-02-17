import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl">💩</p>
      <h2 className="mt-4 font-mono text-xl font-bold">404 — No shit here</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" className="mt-6 inline-block">
        <Button variant="outline" className="font-mono text-xs">
          Go back home
        </Button>
      </Link>
    </div>
  );
}
