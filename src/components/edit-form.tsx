"use client";

import { useActionState } from "react";
import { updateProduct } from "@/lib/actions/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Product = {
  name: string;
  tagline: string;
  description: string | null;
  url: string;
  logoUrl: string | null;
  githubUrl: string | null;
};

export function EditForm({ slug, product }: { slug: string; product: Product }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await updateProduct(slug, formData);
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
        <Label htmlFor="name" className="font-mono text-xs">Name *</Label>
        <Input id="name" name="name" defaultValue={product.name} required maxLength={80} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tagline" className="font-mono text-xs">Tagline *</Label>
        <Input id="tagline" name="tagline" defaultValue={product.tagline} required maxLength={120} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url" className="font-mono text-xs">URL *</Label>
        <Input id="url" name="url" type="url" defaultValue={product.url} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="font-mono text-xs">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={product.description ?? ""}
          rows={4}
          maxLength={2000}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logoUrl" className="font-mono text-xs">Logo URL</Label>
        <Input id="logoUrl" name="logoUrl" type="url" defaultValue={product.logoUrl ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="githubUrl" className="font-mono text-xs">GitHub URL</Label>
        <Input id="githubUrl" name="githubUrl" type="url" defaultValue={product.githubUrl ?? ""} />
      </div>

      <Button type="submit" disabled={isPending} className="w-full font-mono">
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
