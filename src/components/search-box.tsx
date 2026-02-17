"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="hidden sm:block">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="h-8 w-36 rounded-md border border-border bg-background px-2 font-mono text-xs outline-none transition-all placeholder:text-muted-foreground focus:w-48 focus:ring-1 focus:ring-ring"
      />
    </form>
  );
}
