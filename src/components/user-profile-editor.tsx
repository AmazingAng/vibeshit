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

type SocialProfile = {
  bio: string | null;
  wechat: string | null;
  showWechat: boolean;
  twitterHandle: string | null;
  telegram: string | null;
  showTelegram: boolean;
};

export function UserProfileEditor({ initial }: { initial: SocialProfile }) {
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
      alert("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              maxLength={200}
              rows={3}
              value={form.bio}
              onChange={(e) => setStr("bio", e.target.value)}
            />
          </div>

          {/* Twitter — always public */}
          <div className="space-y-1.5">
            <Label htmlFor="twitter">Twitter / X</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">@</span>
              <Input
                id="twitter"
                placeholder="username"
                maxLength={100}
                value={form.twitterHandle}
                onChange={(e) => setStr("twitterHandle", e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">Always public</p>
          </div>

          {/* Telegram — opt-in visibility */}
          <div className="space-y-1.5">
            <Label htmlFor="telegram">Telegram</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">@</span>
              <Input
                id="telegram"
                placeholder="username"
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
                Show on profile (off by default for privacy)
              </label>
            </div>
          </div>

          {/* WeChat — opt-in visibility */}
          <div className="space-y-1.5">
            <Label htmlFor="wechat">WeChat</Label>
            <Input
              id="wechat"
              placeholder="WeChat ID"
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
                Show on profile (off by default for privacy)
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
