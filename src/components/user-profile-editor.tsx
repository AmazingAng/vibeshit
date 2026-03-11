"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

type SocialProfile = {
  bio: string | null;
  wechat: string | null;
  showWechat: boolean;
  twitterHandle: string | null;
  telegram: string | null;
  showTelegram: boolean;
};

export function UserProfileEditor({ initial }: { initial: SocialProfile }) {
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bio: initial.bio ?? "",
    wechat: initial.wechat ?? "",
    showWechat: initial.showWechat,
    twitterHandle: initial.twitterHandle ?? "",
    telegram: initial.telegram ?? "",
    showTelegram: initial.showTelegram,
  });

  function setStr(key: "bio" | "wechat" | "twitterHandle" | "telegram", value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setBool(key: "showWechat" | "showTelegram", value: boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: form.bio || null,
          wechat: form.wechat || null,
          showWechat: form.showWechat,
          twitterHandle: form.twitterHandle || null,
          telegram: form.telegram || null,
          showTelegram: form.showTelegram,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setOpen(false);
      window.location.reload();
    } catch {
      alert(messages.profileEditor.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          {messages.profileEditor.editProfile}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{messages.profileEditor.editProfile}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="bio">{messages.profileEditor.bio}</Label>
            <Textarea
              id="bio"
              placeholder={messages.profileEditor.bioPlaceholder}
              maxLength={200}
              rows={3}
              value={form.bio}
              onChange={(e) => setStr("bio", e.target.value)}
            />
          </div>

          {/* Twitter — always public */}
          <div className="space-y-1.5">
            <Label htmlFor="twitter">{messages.profileEditor.twitter}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">@</span>
              <Input
                id="twitter"
                placeholder={messages.profileEditor.usernamePlaceholder}
                maxLength={100}
                value={form.twitterHandle}
                onChange={(e) => setStr("twitterHandle", e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">{messages.profileEditor.alwaysPublic}</p>
          </div>

          {/* Telegram — opt-in visibility */}
          <div className="space-y-1.5">
            <Label htmlFor="telegram">{messages.profileEditor.telegram}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">@</span>
              <Input
                id="telegram"
                placeholder={messages.profileEditor.usernamePlaceholder}
                maxLength={100}
                value={form.telegram}
                onChange={(e) => setStr("telegram", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="showTelegram"
                checked={form.showTelegram}
                onCheckedChange={(v) => setBool("showTelegram", Boolean(v))}
              />
              <label htmlFor="showTelegram" className="text-xs text-muted-foreground cursor-pointer">
                {messages.profileEditor.showOnProfile}
              </label>
            </div>
          </div>

          {/* WeChat — opt-in visibility */}
          <div className="space-y-1.5">
            <Label htmlFor="wechat">{messages.profileEditor.wechat}</Label>
            <Input
              id="wechat"
              placeholder={messages.profileEditor.wechatPlaceholder}
              maxLength={100}
              value={form.wechat}
              onChange={(e) => setStr("wechat", e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="showWechat"
                checked={form.showWechat}
                onCheckedChange={(v) => setBool("showWechat", Boolean(v))}
              />
              <label htmlFor="showWechat" className="text-xs text-muted-foreground cursor-pointer">
                {messages.profileEditor.showOnProfile}
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {messages.profileEditor.cancel}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? messages.forms.saving : messages.profileEditor.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
