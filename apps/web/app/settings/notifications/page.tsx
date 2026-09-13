"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Skeleton, Toast } from "@reworth/ui-web";
import { ApiError } from "../../../lib/api";
import { getAccessToken } from "../../../lib/auth";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  categoryLabel,
  channelLabel,
  getNotificationPreferences,
  isCriticalCategory,
  patchNotificationPreference,
  type NotificationChannel,
  type NotificationPreference,
} from "../../../lib/notifications";

type PrefKey = `${string}:${NotificationChannel}`;

function prefKey(category: string, channel: string): PrefKey {
  return `${category}:${channel}` as PrefKey;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Map<PrefKey, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<PrefKey | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone?: "info" | "success" | "warn" | "error";
  } | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/onboarding");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await getNotificationPreferences(token);
      const map = new Map<PrefKey, boolean>();
      for (const cat of NOTIFICATION_CATEGORIES) {
        for (const ch of NOTIFICATION_CHANNELS) {
          map.set(prefKey(cat, ch), true);
        }
      }
      for (const row of rows) {
        map.set(
          prefKey(row.category, row.channel as NotificationChannel),
          row.enabled,
        );
      }
      setPrefs(map);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/onboarding");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const criticalNote = useMemo(
    () =>
      "Payment, delivery, and dispute alerts stay on for in-app so you never miss escrow or fulfilment updates.",
    [],
  );

  async function toggle(
    category: string,
    channel: NotificationChannel,
    enabled: boolean,
  ) {
    if (channel === "IN_APP" && isCriticalCategory(category) && !enabled) {
      setToast({
        message: "In-app alerts for this category cannot be turned off",
        tone: "warn",
      });
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    const key = prefKey(category, channel);
    const prev = prefs.get(key) ?? true;
    setPrefs((m) => new Map(m).set(key, enabled));
    setSaving(key);
    try {
      const row: NotificationPreference = await patchNotificationPreference(
        token,
        { category, channel, enabled },
      );
      setPrefs((m) => new Map(m).set(key, row.enabled));
    } catch (err) {
      setPrefs((m) => new Map(m).set(key, prev));
      setToast({
        message: err instanceof ApiError ? err.message : "Save failed",
        tone: "error",
      });
    } finally {
      setSaving(null);
    }
  }

  return (
    <main className="relative min-h-[100dvh] bg-[var(--rw-bg)] text-[var(--rw-ink)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28vh]"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(14,159,110,0.1), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/notifications"
            className="text-sm font-medium text-[var(--rw-ink-muted)] underline-offset-2 hover:underline"
          >
            ← Notifications
          </Link>
          <span className="text-xl font-semibold tracking-tight">ReWorth</span>
        </header>

        <h1 className="text-2xl font-semibold tracking-tight">
          Notification preferences
        </h1>
        <p className="mt-2 text-sm text-[var(--rw-ink-muted)]">{criticalNote}</p>

        {loading ? (
          <div className="mt-8 space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="mt-12">
            <EmptyState
              title="Preferences unavailable"
              description={error}
              action={
                <Button variant="primary" onClick={() => void load()}>
                  Retry
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {NOTIFICATION_CATEGORIES.map((category) => {
              const critical = isCriticalCategory(category);
              return (
                <section
                  key={category}
                  className="rounded-[var(--rw-radius-lg)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] p-4"
                  aria-labelledby={`pref-${category}`}
                >
                  <h2
                    id={`pref-${category}`}
                    className="text-base font-semibold"
                  >
                    {categoryLabel(category)}
                  </h2>
                  {critical ? (
                    <p className="mt-1 text-xs text-[var(--rw-ink-muted)]">
                      In-app cannot be fully disabled for payment, delivery, or
                      dispute updates.
                    </p>
                  ) : null}
                  <ul className="mt-3 space-y-3">
                    {NOTIFICATION_CHANNELS.map((channel) => {
                      const key = prefKey(category, channel);
                      const enabled = prefs.get(key) ?? true;
                      const locked =
                        channel === "IN_APP" && critical && enabled;
                      const busy = saving === key;
                      return (
                        <li
                          key={channel}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-sm">
                            {channelLabel(channel)}
                          </span>
                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <span className="sr-only">
                              {categoryLabel(category)} via{" "}
                              {channelLabel(channel)}
                            </span>
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[var(--rw-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                              checked={enabled}
                              disabled={busy || locked}
                              onChange={(e) =>
                                void toggle(category, channel, e.target.checked)
                              }
                            />
                            {locked ? (
                              <span className="text-xs text-[var(--rw-ink-muted)]">
                                Required
                              </span>
                            ) : null}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {toast ? (
        <div className="fixed bottom-8 left-1/2 z-50 w-[min(100%-2rem,24rem)] -translate-x-1/2">
          <Toast
            message={toast.message}
            tone={toast.tone}
            onDismiss={() => setToast(null)}
          />
        </div>
      ) : null}
    </main>
  );
}
