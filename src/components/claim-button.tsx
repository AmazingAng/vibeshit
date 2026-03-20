"use client";

import { useState } from "react";
import { claimProduct } from "@/lib/actions/claim";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { toast } from "sonner";

interface ClaimButtonProps {
  productId: string;
  canClaim: boolean; // true if current user's username matches repo owner
}

export function ClaimButton({ productId, canClaim }: ClaimButtonProps) {
  const { messages } = useI18n();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  if (claimed) {
    return (
      <span className="rounded-md border border-border bg-muted/50 px-3 py-1.5 font-mono text-xs text-muted-foreground">
        {messages.claim.alreadyClaimed}
      </span>
    );
  }

  if (!canClaim) {
    return (
      <span className="font-mono text-xs text-muted-foreground" title={messages.claim.claimHint}>
        {messages.claim.claimHint}
      </span>
    );
  }

  const handleClaim = async () => {
    setIsClaiming(true);
    const result = await claimProduct(productId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(messages.claim.claimSuccess);
      setClaimed(true);
    }
    setIsClaiming(false);
  };

  return (
    <Button
      onClick={handleClaim}
      disabled={isClaiming}
      size="sm"
      variant="outline"
      className="font-mono text-xs"
    >
      {isClaiming ? "..." : messages.claim.claimButton}
    </Button>
  );
}
