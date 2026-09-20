"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Megaphone } from "lucide-react";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  tag?: string;
  created_at: string;
}

const SEEN_KEY = "zenox.notifications.seen";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setLastSeen(localStorage.getItem(SEEN_KEY));
    } catch {
      // Private mode can throw on access; unread state simply degrades to "all new".
    }
  }, []);

  const fetchNotifications = () => {
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && Array.isArray(data.notifications)) {
          setItems(data.notifications);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 60s
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const unread = items.filter((n) => !lastSeen || n.created_at > lastSeen).length;

  const openPanel = () => {
    setOpen((wasOpen) => {
      if (!wasOpen && items[0]) {
        try {
          localStorage.setItem(SEEN_KEY, items[0].created_at);
        } catch {
          // Ignore
        }
        setLastSeen(items[0].created_at);
      }
      return !wasOpen;
    });
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={openPanel}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative grid size-9 place-items-center rounded-full text-white/60 transition-colors duration-200 hover:bg-white/10 hover:text-white cursor-pointer"
      >
        <Bell className="size-4.5" />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold leading-4 text-on-primary"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 max-h-96 w-84 overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-black/95 p-3 backdrop-blur-[40px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] z-50">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10 mb-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
              Notifications
            </p>
            {items.length > 0 && (
              <span className="text-[11px] text-white/40">{items.length} total</span>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-label-sm text-white/50">
              You are all caught up. No new announcements.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {items.map((item) => (
                <li key={item.id} className="rounded-xl px-2.5 py-3 hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-start gap-2.5">
                    <Megaphone className="mt-0.5 size-4 shrink-0 text-white/70" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-label-md font-semibold text-white truncate">
                          {item.title}
                        </p>
                        {item.tag && (
                          <span className="shrink-0 rounded border border-white/15 bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/75">
                            {item.tag}
                          </span>
                        )}
                      </div>

                      {item.body && (
                        <p className="mt-1 text-label-sm leading-relaxed text-white/60 break-words">
                          {item.body}
                        </p>
                      )}

                      <time
                        dateTime={item.created_at}
                        className="mt-1.5 block text-[10px] text-white/40"
                      >
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.created_at))}
                      </time>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
