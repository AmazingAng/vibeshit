"use client";

import { useActionState } from "react";
import { submitProduct } from "@/lib/actions/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";

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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr]">
        <ImageUpload
          name="logoUrl"
          type="logo"
          label="Logo"
          hint="Square, max 2MB"
        />
        <ImageUpload
          name="bannerUrl"
          type="banner"
          label="Banner"
          hint="1200×630px recommended, max 5MB. Shows as preview on X/Twitter."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="agent" className="font-mono text-xs">
            Agent
          </Label>
          <Input
            id="agent"
            name="agent"
            placeholder="e.g. Cursor, Claude Code, Lovable"
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="llm" className="font-mono text-xs">
            LLM
          </Label>
          <Input
            id="llm"
            name="llm"
            placeholder="e.g. Claude Sonnet 4.5, GPT 5.2"
            maxLength={100}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags" className="font-mono text-xs">
          Tags
        </Label>
        <Input
          id="tags"
          name="tags"
          placeholder="e.g. ai, saas, developer-tools, web3"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated tags to categorize your project.
        </p>
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
