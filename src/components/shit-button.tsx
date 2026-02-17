"use client";

import { useState, useTransition } from "react";
import { toggleVote } from "@/lib/actions/vote";
import { cn } from "@/lib/utils";

interface ShitButtonProps {
  productId: string;
  initialCount: number;
  initialVoted: boolean;
  isAuthenticated: boolean;
}

export function ShitButton({
  productId,
  initialCount,
  initialVoted,
  isAuthenticated,
}: ShitButtonProps) {
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!isAuthenticated) {
      window.location.href = "/api/auth/signin/github";
      return;
    }

    // Optimistic update
    setVoted(!voted);
    setCount(voted ? count - 1 : count + 1);

    startTransition(async () => {
      const result = await toggleVote(productId);
      if (result.error) {
        // Revert on error
        setVoted(voted);
        setCount(count);
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 transition-all",
        "hover:scale-105 active:scale-95",
        "min-w-[60px] cursor-pointer",
        voted
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background hover:border-foreground/50"
      )}
    >
      <span className={cn("text-lg transition-transform", voted && "scale-110")}>
        💩
      </span>
      <span className="font-mono text-xs font-bold">{count}</span>
    </button>
  );
}
