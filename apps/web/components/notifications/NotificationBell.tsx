"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "../../lib/api";
import { getAccessToken } from "../../lib/auth";
import {
  deepLinkToPath,
  listNotifications,
  markNotificationRead,
  type AppNotification,
} from "../../lib/notifications";

type Props = {
  className?: string;
};

export function NotificationBell({ className }: Props) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshUnread = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUnread(0);
      return;
    }
    try {
      const rows = await listNotifications(token, { unread: true });
      setUnread(rows.length);
    } catch {
      /* silent — bell is non-blocking */
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
    const id = window.setInterval(() => void refreshUnread(), 60_000);
    return () => window.clearInterval(id);
  }, [refreshUnread]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle() {
    const token = getAccessToken();
    if (!token) {
      router.push("/onboarding");
      return;
    }
    const next = !open;
    setOpen(next);
    if (!next) return;
    setLoading(true);
    try {
      const rows = await listNotifications(token);
      setPreview(rows.slice(0, 6));
      await refreshUnread();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/onboarding");
      }
    } finally {
      setLoading(false);
    }
  }

  async function openItem(n: AppNotification) {
    const token = getAccessToken();
    if (token && !n.readAt) {
      try {
        await markNotificationRead(token, n.id);
        setUnread((c) => Math.max(0, c - 1));
        setPreview((rows) =>
          rows.map((r) =>
            r.id === n.id ? { ...r, readAt: new Date().toISOString() } : r,
          ),
        );
      } catch {
        /* navigate anyway */
      }
    }
    setOpen(false);
    const path = deepLinkToPath(n.deepLink) ?? "/notifications";
    router.push(path);
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--rw-radius)] text-[var(--rw-ink-muted)] hover:bg-[var(--rw-bg-elevated)] hover:text-[var(--rw-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)]"
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--rw-accent)] px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-[var(--rw-radius-lg)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-[var(--rw-border)] px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <Link
              href="/notifications"
              className="text-xs font-medium text-[var(--rw-accent)] underline-offset-2 hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
          {loading ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--rw-ink-muted)]">
              Loading…
            </p>
          ) : preview.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--rw-ink-muted)]">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {preview.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void openItem(n)}
                    className="flex w-full flex-col gap-0.5 border-b border-[var(--rw-border)]/60 px-3 py-2.5 text-left hover:bg-[var(--rw-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rw-accent)]"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span
                        className={[
                          "text-sm leading-snug",
                          n.readAt
                            ? "font-medium text-[var(--rw-ink-muted)]"
                            : "font-semibold text-[var(--rw-ink)]",
                        ].join(" ")}
                      >
                        {n.title}
                      </span>
                      {!n.readAt ? (
                        <span
                          aria-hidden
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--rw-accent)]"
                        />
                      ) : null}
                    </span>
                    <span className="line-clamp-2 text-xs text-[var(--rw-ink-muted)]">
                      {n.body}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-[var(--rw-border)] px-3 py-2">
            <Link
              href="/settings/notifications"
              className="text-xs font-medium text-[var(--rw-ink-muted)] underline-offset-2 hover:underline"
              onClick={() => setOpen(false)}
            >
              Notification settings
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.7 1.7 0 0 0 3.4 0" />
    </svg>
  );
}
