"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatNgn } from "@reworth/shared";
import {
  Button,
  Chip,
  EmptyState,
  Skeleton,
} from "@reworth/ui-web";
import { ApiError, apiFetch } from "../../lib/api";
import { getAccessToken } from "../../lib/auth";
import {
  fulfilmentLabel,
  listOrders,
  orderStatusLabel,
  type OrderDto,
} from "../../lib/orders";
import type { MeResponse } from "../../lib/types";

export default function OrdersListPage() {
  const router = useRouter();
  const [meId, setMeId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/onboarding");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [me, list] = await Promise.all([
        apiFetch<MeResponse>("/me", { token }),
        listOrders(token),
      ]);
      setMeId(me.id);
      setOrders(list);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/onboarding");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="relative min-h-[100dvh] bg-[var(--rw-bg)] text-[var(--rw-ink)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[32vh]"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 40% 0%, rgba(14,159,110,0.1), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/account"
            className="text-xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)]"
          >
            ReWorth
          </Link>
          <Link
            href="/account"
            className="text-sm font-medium text-[var(--rw-ink-muted)] underline-offset-2 hover:underline"
          >
            Account
          </Link>
        </header>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Orders
        </h1>
        <p className="mt-2 text-sm text-[var(--rw-ink-muted)]">
          Buys and sales with buyer protection.
        </p>

        {loading ? (
          <div className="mt-8 space-y-3" aria-busy="true">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <div className="mt-8">
            <EmptyState
              title="Couldn’t load orders"
              description={error}
              action={
                <Button variant="secondary" onClick={() => void load()}>
                  Retry
                </Button>
              }
            />
          </div>
        ) : !orders.length ? (
          <div className="mt-8">
            <EmptyState
              title="No orders yet"
              description="When you buy or sell with protection, orders show up here."
              action={
                <Link href="/">
                  <Button variant="primary">Browse listings</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-[var(--rw-border)] rounded-[var(--rw-radius-lg)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)]">
            {orders.map((o) => {
              const role =
                meId === o.buyerId
                  ? "Buying"
                  : meId === o.sellerId
                    ? "Selling"
                    : "Order";
              return (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-[var(--rw-accent-muted)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {formatNgn({ amountKobo: o.totalKobo })}
                      </p>
                      <p className="mt-0.5 text-sm text-[var(--rw-ink-muted)]">
                        {role} · {fulfilmentLabel(String(o.fulfilmentMethod))}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--rw-ink-muted)]">
                        {new Date(o.createdAt).toLocaleString("en-NG")}
                      </p>
                    </div>
                    <Chip selected className="pointer-events-none shrink-0 self-start sm:self-center">
                      {orderStatusLabel(String(o.status))}
                    </Chip>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
