"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getUnreadCount, getNotifications, markAsRead, markAllAsRead } from "@/lib/actions/notification";
import { useI18n } from "@/components/i18n-provider";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const { messages } = useI18n();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    const result = await getUnreadCount();
    setUnreadCount(result.count);
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = async () => {
    if (!isOpen && !loaded) {
      const result = await getNotifications();
      setNotifications(result.notifications);
      setLoaded(true);
    }
    setIsOpen(!isOpen);
  };

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={messages.notifications.title}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="font-mono text-sm font-bold">{messages.notifications.title}</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                {messages.notifications.markAllRead}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                {messages.notifications.empty}
              </p>
            ) : (
              notifications.map((n) => {
                const content = (
                  <div
                    key={n.id}
                    className={`border-b border-border px-4 py-3 transition-colors hover:bg-muted/50 ${!n.read ? "bg-primary/5" : ""}`}
                    onClick={() => !n.read && handleMarkRead(n.id)}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{n.message}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );

                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setIsOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  content
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
