"use client";

import { toggleCommunityInvite } from "@/lib/actions/product";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/components/i18n-provider";
import { useState } from "react";

export type CommunityUser = {
  id: string;
  username: string | null;
  wechat: string | null;
  telegram: string | null;
  wechatInvited: boolean;
  telegramInvited: boolean;
  productCount: number;
  topProductName: string | null;
  topProductShitCount: number;
};

type Platform = "wechat" | "telegram";

export function AdminCommunityList({
  users,
  platform,
}: {
  users: CommunityUser[];
  platform: Platform;
}) {
  const { messages } = useI18n();
  const t = messages.admin;

  const [invited, setInvited] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const u of users) {
      map[u.id] = platform === "wechat" ? u.wechatInvited : u.telegramInvited;
    }
    return map;
  });

  const handleToggle = async (userId: string, checked: boolean) => {
    setInvited((prev) => ({ ...prev, [userId]: checked }));
    await toggleCommunityInvite(userId, platform, checked);
  };

  if (users.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t.noEligible}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="whitespace-nowrap px-3 py-2 font-medium">{t.colGithub}</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">{t.colProducts}</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">{t.colTopProduct}</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">
              {platform === "wechat" ? t.colWechat : t.colTelegram}
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-center font-medium">{t.colInvited}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border last:border-0">
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                {u.username ?? t.notProvided}
              </td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                {u.productCount}
              </td>
              <td className="px-3 py-2 text-xs">
                {u.topProductName ? (
                  <span>
                    {u.topProductName}
                    <span className="ml-1 text-muted-foreground">
                      (💩 {u.topProductShitCount})
                    </span>
                  </span>
                ) : (
                  t.notProvided
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                {platform === "wechat"
                  ? u.wechat ?? t.notProvided
                  : u.telegram ?? t.notProvided}
              </td>
              <td className="px-3 py-2 text-center">
                <Checkbox
                  checked={invited[u.id] ?? false}
                  onCheckedChange={(checked) =>
                    handleToggle(u.id, checked === true)
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
