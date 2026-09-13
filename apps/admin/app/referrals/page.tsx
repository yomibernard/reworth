"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@reworth/ui-web";
import { adminFetch, ApiError } from "../../lib/api";
import {
  PageHeader,
  SimpleTable,
  StatusLine,
} from "../../components/AdminUi";

type ReferralStats = {
  totalCodes?: number;
  totalAttributions?: number;
  rewardsGranted?: number;
  rewardsPending?: number;
  riskFlagged?: number;
  [key: string]: number | undefined;
};

type LedgerRow = {
  id: string;
  userId?: string;
  referrerId?: string;
  status: string;
  rewardType?: string;
  grantedAt?: string | null;
  createdAt?: string;
  displayName?: string | null;
};

export default function AdminReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, ledgerRes] = await Promise.all([
        adminFetch<ReferralStats>("/admin/referrals/stats"),
        adminFetch<{ items: LedgerRow[] } | LedgerRow[]>(
          "/admin/referrals/ledger",
        ),
      ]);
      setStats(statsRes);
      setLedger(Array.isArray(ledgerRes) ? ledgerRes : ledgerRes.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
      setStats(null);
      setLedger([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = ledger.map((r) => ({
    id: r.id,
    user: r.displayName || r.userId?.slice(0, 8) || "—",
    status: r.status,
    rewardType: r.rewardType ?? "FREE_BOOST",
    grantedAt: r.grantedAt
      ? new Date(r.grantedAt).toLocaleString("en-NG")
      : "—",
    createdAt: r.createdAt
      ? new Date(r.createdAt).toLocaleDateString("en-NG")
      : "—",
  }));

  const statEntries = stats
    ? Object.entries(stats).filter(([, v]) => typeof v === "number")
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Referrals"
        description="Programme stats and reward ledger."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !rows.length && !statEntries.length}
      />

      {statEntries.length ? (
        <ul className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statEntries.map(([key, value]) => (
            <li
              key={key}
              className="rounded-[var(--rw-radius)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-4 py-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--rw-ink-muted)]">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {rows.length ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">Reward ledger</h2>
          <SimpleTable
            columns={[
              { key: "user", label: "User" },
              { key: "status", label: "Status" },
              { key: "rewardType", label: "Reward" },
              { key: "grantedAt", label: "Granted" },
              { key: "createdAt", label: "Created" },
            ]}
            rows={rows}
          />
        </>
      ) : null}
    </div>
  );
}
