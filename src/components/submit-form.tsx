"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitProduct } from "@/lib/actions/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { GalleryUpload } from "@/components/gallery-upload";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";

type SubmitDraft = {
  name: string;
  tagline: string;
  url: string;
  description: string;
  logoUrl: string;
  images: string[];
  agent: string;
  llm: string;
  tags: string;
  githubUrl: string;
  sharingOthers: boolean;
  makerName: string;
  makerLink: string;
};

const DRAFT_KEY = "vibeshit.submit.draft.v1";
const BUTTON_FRAMES = ["🚽", "🚽💩", "🚽💩💩", "🚽💩💩💩", "🚽💩💩"];

const emptyDraft: SubmitDraft = {
  name: "",
  tagline: "",
  url: "",
  description: "",
  logoUrl: "",
  images: [],
  agent: "",
  llm: "",
  tags: "",
  githubUrl: "",
  sharingOthers: false,
  makerName: "",
  makerLink: "",
};

export function SubmitForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await submitProduct(formData);
      return result ?? null;
    },
    null
  );
  const [draft, setDraft] = useState<SubmitDraft>(emptyDraft);
  const [frameIdx, setFrameIdx] = useState(0);
  const shouldClearDraftOnUnmountRef = useRef(false);
  const { messages } = useI18n();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SubmitDraft>;
      setDraft((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore broken local cache
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (!state?.error) return;
    shouldClearDraftOnUnmountRef.current = false;
    toast.error(state.error);
  }, [state?.error]);

  useEffect(() => {
    return () => {
      if (shouldClearDraftOnUnmountRef.current) {
        localStorage.removeItem(DRAFT_KEY);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPending) {
      setFrameIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % BUTTON_FRAMES.length);
    }, 220);
    return () => clearInterval(timer);
  }, [isPending]);

  const setField = <K extends keyof SubmitDraft>(key: K, value: SubmitDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={() => {
        shouldClearDraftOnUnmountRef.current = true;
      }}
    >
      <div className="space-y-4 rounded-lg border border-border p-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.sharingOthers}
            onChange={(e) => setField("sharingOthers", e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span className="font-mono text-xs">{messages.forms.sharingOthersToggle}</span>
        </label>
        {draft.sharingOthers && (
          <div className="space-y-4 pl-6">
            <div className="space-y-2">
              <Label htmlFor="makerName" className="font-mono text-xs">
                {messages.forms.makerName}
              </Label>
              <Input
                id="makerName"
                name="makerName"
                placeholder={messages.forms.makerNamePlaceholder}
                value={draft.makerName}
                onChange={(e) => setField("makerName", e.target.value)}
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
                value={draft.makerLink}
                onChange={(e) => setField("makerLink", e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {messages.forms.makerLinkHint}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name" className="font-mono text-xs">
          {messages.forms.name}
        </Label>
        <Input
          id="name"
          name="name"
          placeholder={messages.forms.projectNamePlaceholder}
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
          required
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tagline" className="font-mono text-xs">
          {messages.forms.tagline}
        </Label>
        <Input
          id="tagline"
          name="tagline"
          placeholder={messages.forms.taglinePlaceholder}
          value={draft.tagline}
          onChange={(e) => setField("tagline", e.target.value)}
          required
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url" className="font-mono text-xs">
          {messages.forms.url}
        </Label>
        <Input
          id="url"
          name="url"
          type="url"
          placeholder={messages.forms.urlPlaceholder}
          value={draft.url}
          onChange={(e) => setField("url", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="font-mono text-xs">
          {messages.forms.description}
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder={messages.forms.descriptionPlaceholder}
          rows={4}
          value={draft.description}
          onChange={(e) => setField("description", e.target.value)}
          maxLength={2000}
          required
        />
      </div>

      <ImageUpload
        name="logoUrl"
        type="logo"
        value={draft.logoUrl}
        onChange={(value) => setField("logoUrl", value)}
        label={messages.forms.logo}
        hint={messages.forms.logoHint}
      />

      <GalleryUpload
        name="images"
        value={draft.images}
        onChange={(value) => setField("images", value)}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="agent" className="font-mono text-xs">
            {messages.forms.agent}
          </Label>
          <Input
            id="agent"
            name="agent"
            placeholder={messages.forms.agentPlaceholder}
            value={draft.agent}
            onChange={(e) => setField("agent", e.target.value)}
            maxLength={100}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="llm" className="font-mono text-xs">
            {messages.forms.llm}
          </Label>
          <Input
            id="llm"
            name="llm"
            placeholder={messages.forms.llmPlaceholder}
            value={draft.llm}
            onChange={(e) => setField("llm", e.target.value)}
            maxLength={100}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags" className="font-mono text-xs">
          {messages.forms.tags}
        </Label>
        <Input
          id="tags"
          name="tags"
          placeholder={messages.forms.tagsPlaceholder}
          value={draft.tags}
          onChange={(e) => setField("tags", e.target.value)}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          {messages.forms.tagsHint}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="githubUrl" className="font-mono text-xs">
          {messages.forms.githubUrl}
        </Label>
        <Input
          id="githubUrl"
          name="githubUrl"
          type="url"
          placeholder={messages.forms.githubPlaceholder}
          value={draft.githubUrl}
          onChange={(e) => setField("githubUrl", e.target.value)}
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full font-mono"
      >
        {isPending
          ? `${BUTTON_FRAMES[frameIdx]} ${messages.submitForm.aiReviewing}`
          : messages.submitForm.buttonDefault}
      </Button>
    </form>
  );
}
