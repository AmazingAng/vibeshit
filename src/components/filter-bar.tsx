"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface FilterBarProps {
  agents: string[];
  llms: string[];
  tags: string[];
}

export function FilterBar({ agents, llms, tags }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentAgent = searchParams.get("agent") ?? "";
  const currentLlm = searchParams.get("llm") ?? "";
  const currentTag = searchParams.get("tag") ?? "";

  const hasAny = agents.length > 0 || llms.length > 0 || tags.length > 0;
  const hasActive = currentAgent || currentLlm || currentTag;

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("agent");
    params.delete("llm");
    params.delete("tag");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pb-4">
      {agents.length > 0 && (
        <select
          value={currentAgent}
          onChange={(e) => update("agent", e.target.value)}
          className="h-7 rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground outline-none transition-colors hover:border-foreground/30 focus:ring-1 focus:ring-ring"
        >
          <option value="">All Agents</option>
          {agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      )}

      {llms.length > 0 && (
        <select
          value={currentLlm}
          onChange={(e) => update("llm", e.target.value)}
          className="h-7 rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground outline-none transition-colors hover:border-foreground/30 focus:ring-1 focus:ring-ring"
        >
          <option value="">All LLMs</option>
          {llms.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {tags.map((t) => {
            const active = currentTag === t;
            return (
              <button
                key={t}
                onClick={() => update("tag", active ? "" : t)}
                className={`rounded-full px-2 py-0.5 font-mono text-[11px] transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                #{t}
              </button>
            );
          })}
        </div>
      )}

      {hasActive && (
        <button
          onClick={clearAll}
          className="font-mono text-[11px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}
