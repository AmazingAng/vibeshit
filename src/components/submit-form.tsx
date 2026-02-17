"use client";

import { useActionState } from "react";
import { submitProduct } from "@/lib/actions/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function SubmitForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await submitProduct(formData);
      return result ?? null;
    },
    null
  );

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name" className="font-mono text-xs">
          Name *
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="My Vibe Project"
          required
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tagline" className="font-mono text-xs">
          Tagline *
        </Label>
        <Input
          id="tagline"
          name="tagline"
          placeholder="A one-liner that describes your project"
          required
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url" className="font-mono text-xs">
          URL *
        </Label>
        <Input
          id="url"
          name="url"
          type="url"
          placeholder="https://myproject.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="font-mono text-xs">
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Tell us more about your project..."
          rows={4}
          maxLength={2000}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logoUrl" className="font-mono text-xs">
          Logo URL
        </Label>
        <Input
          id="logoUrl"
          name="logoUrl"
          type="url"
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="githubUrl" className="font-mono text-xs">
          GitHub URL
        </Label>
        <Input
          id="githubUrl"
          name="githubUrl"
          type="url"
          placeholder="https://github.com/user/repo"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full font-mono"
      >
        {isPending ? "Submitting..." : "💩 Submit Your Shit"}
      </Button>
    </form>
  );
}
