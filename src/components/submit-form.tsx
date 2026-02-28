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
      <div className="space-y-2">
        <Label htmlFor="name" className="font-mono text-xs">
          Name *
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="My Vibe Project"
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
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
          value={draft.tagline}
          onChange={(e) => setField("tagline", e.target.value)}
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
          value={draft.url}
          onChange={(e) => setField("url", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="font-mono text-xs">
          Description *
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Tell us more about your project..."
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
        label="Logo *"
        hint="Square, max 2MB"
      />

      <GalleryUpload
        name="images"
        value={draft.images}
        onChange={(value) => setField("images", value)}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="agent" className="font-mono text-xs">
            Agent *
          </Label>
          <Input
            id="agent"
            name="agent"
            placeholder="e.g. Cursor, Claude Code, Lovable"
            value={draft.agent}
            onChange={(e) => setField("agent", e.target.value)}
            maxLength={100}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="llm" className="font-mono text-xs">
            LLM *
          </Label>
          <Input
            id="llm"
            name="llm"
            placeholder="e.g. Claude Sonnet 4.5, GPT 5.2"
            value={draft.llm}
            onChange={(e) => setField("llm", e.target.value)}
            maxLength={100}
            required
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
          value={draft.tags}
          onChange={(e) => setField("tags", e.target.value)}
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
          value={draft.githubUrl}
          onChange={(e) => setField("githubUrl", e.target.value)}
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full font-mono"
      >
        {isPending ? `${BUTTON_FRAMES[frameIdx]} AI Reviewing...` : "💩 Submit Your Shit"}
      </Button>
    </form>
  );
}
