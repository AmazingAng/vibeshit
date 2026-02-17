"use client";

import { useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

interface UserMenuProps {
  userUsername: string;
  userName: string | null;
  userImage: string | null;
  signOutAction: () => Promise<void>;
}

export function UserMenu({ userUsername, userName, userImage, signOutAction }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <Link
        href={`/user/${userUsername}`}
        className="block rounded-full outline-none ring-offset-background transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={userImage ?? ""} alt={userName ?? ""} />
          <AvatarFallback className="text-xs">
            {userName?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>
      </Link>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border border-border bg-popover p-1 shadow-md">
          <Link
            href={`/user/${userUsername}`}
            className="block w-full rounded-sm px-3 py-1.5 font-mono text-xs text-popover-foreground transition-colors hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <div className="my-1 h-px bg-border" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full cursor-pointer rounded-sm px-3 py-1.5 text-left font-mono text-xs text-destructive transition-colors hover:bg-accent"
            >
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
