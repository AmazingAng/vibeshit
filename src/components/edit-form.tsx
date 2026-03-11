"use client";

import { useActionState, useState } from "react";
import { updateProduct } from "@/lib/actions/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { GalleryUpload } from "@/components/gallery-upload";
import { useI18n } from "@/components/i18n-provider";

type Product = {
  name: string;
  tagline: string;
  description: string | null;
  url: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  images: string | null;
  githubUrl: string | null;
  agent: string | null;
  llm: string | null;
  tags: string | null;
  makerName: string | null;
  makerLink: string | null;
};

export function EditForm({ slug, product }: { slug: string; product: Product }) {
  const { messages } = useI18n();
  const [sharingOthers, setSharingOthers] = useState(!!product.makerName);
  const [makerName, setMakerName] = useState(product.makerName ?? "");
  const [makerLink, setMakerLink] = useState(product.makerLink ?? "");
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
        <Label htmlFor="name" className="font-mono text-xs">{messages.forms.name}</Label>
        <Input id="name" name="name" defaultValue={product.name} required maxLength={80} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tagline" className="font-mono text-xs">{messages.forms.tagline}</Label>
        <Input id="tagline" name="tagline" defaultValue={product.tagline} required maxLength={120} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url" className="font-mono text-xs">{messages.forms.url}</Label>
        <Input id="url" name="url" type="url" defaultValue={product.url} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="font-mono text-xs">{messages.forms.description}</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={product.description ?? ""}
          rows={4}
          maxLength={2000}
          required
        />
      </div>

      <ImageUpload
        name="logoUrl"
        type="logo"
        label={messages.forms.logo}
        defaultValue={product.logoUrl}
        hint={messages.forms.logoHint}
      />

      <GalleryUpload
        name="images"
        defaultValue={
          product.images
            ? JSON.parse(product.images)
            : product.bannerUrl
              ? [product.bannerUrl]
              : []
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="agent" className="font-mono text-xs">{messages.forms.agent}</Label>
          <Input id="agent" name="agent" defaultValue={product.agent ?? ""} placeholder={messages.forms.editAgentPlaceholder} maxLength={100} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="llm" className="font-mono text-xs">{messages.forms.llm}</Label>
          <Input id="llm" name="llm" defaultValue={product.llm ?? ""} placeholder={messages.forms.editLlmPlaceholder} maxLength={100} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags" className="font-mono text-xs">{messages.forms.tags}</Label>
        <Input
          id="tags"
          name="tags"
          defaultValue={product.tags ? JSON.parse(product.tags).join(", ") : ""}
          placeholder={messages.forms.editTagsPlaceholder}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">{messages.forms.tagsHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="githubUrl" className="font-mono text-xs">{messages.forms.githubUrl}</Label>
        <Input
          id="githubUrl"
          name="githubUrl"
          type="url"
          defaultValue={product.githubUrl ?? ""}
          placeholder={messages.forms.githubPlaceholder}
        />
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sharingOthers}
            onChange={(e) => setSharingOthers(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span className="font-mono text-xs">{messages.forms.sharingOthersToggle}</span>
        </label>
        {sharingOthers && (
          <div className="space-y-4 pl-6">
            <div className="space-y-2">
              <Label htmlFor="makerName" className="font-mono text-xs">
                {messages.forms.makerName}
              </Label>
              <Input
                id="makerName"
                name="makerName"
                placeholder={messages.forms.makerNamePlaceholder}
                value={makerName}
                onChange={(e) => setMakerName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="makerLink" className="font-mono text-xs">
                {messages.forms.makerLink}
              </Label>
              <Input
                id="makerLink"
                name="makerLink"
                type="url"
                placeholder={messages.forms.makerLinkPlaceholder}
                value={makerLink}
                onChange={(e) => setMakerLink(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {messages.forms.makerLinkHint}
              </p>
            </div>
          </div>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full font-mono">
        {isPending ? messages.forms.saving : messages.forms.saveChanges}
      </Button>
    </form>
  );
}
