"use client";

import { useState } from "react";
import { Button } from "@reworth/ui-web";
import { adminFetch, ApiError } from "../../lib/api";
import {
  PageHeader,
  SimpleTable,
  StatusLine,
  useAdminQuery,
} from "../../components/AdminUi";

type FinanceSummary = {
  windowDays: number;
  since: string;
  byStream: Record<
    string,
    { grossKobo: number; netKobo: number; count: number }
  >;
  byCity: Record<string, { netKobo: number; count: number }>;
  grossTotalKobo: number;
  netTotalKobo: number;
  gmvKobo: number;
  takeRate: number;
  boostAttachRate: number;
  liveListings: number;
  boostedListings: number;
  mrr: {
    activeKobo: number;
    activeSubs: number;
    netNew: number;
    churn: number;
  };
};

type ReconRes = {
  latest: {
    id: string;
    startedAt: string;
    finishedAt: string | null;
    matchedCount: number;
    mismatchCount: number;
  } | null;
  alerts: {
    id: string;
    kind: string;
    severity: string;
    message: string;
    createdAt: string;
    resolvedAt: string | null;
  }[];
};

function formatNgn(kobo: number): string {
  return `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

export default function FinancePage() {
  const {
    data: summary,
    error: summaryError,
    loading: summaryLoading,
    reload: reloadSummary,
  } = useAdminQuery<FinanceSummary>("/admin/finance/summary?days=30");
  const {
    data: recon,
    error: reconError,
    loading: reconLoading,
    reload: reloadRecon,
  } = useAdminQuery<ReconRes>("/admin/finance/reconciliation");
  const [reconMsg, setReconMsg] = useState<string | null>(null);
  const [reconBusy, setReconBusy] = useState(false);

  async function runReconciliation(injectMismatch: boolean) {
    setReconBusy(true);
    setReconMsg(null);
    try {
      await adminFetch("/admin/finance/reconciliation/run", {
        method: "POST",
        body: { injectMismatch },
      });
      setReconMsg(
        injectMismatch
          ? "Reconciliation run with injected mismatch."
          : "Reconciliation completed.",
      );
      await Promise.all([reloadRecon(), reloadSummary()]);
    } catch (e) {
      setReconMsg(e instanceof ApiError ? e.message : "Reconciliation failed");
    } finally {
      setReconBusy(false);
    }
  }

  const streamRows = summary
    ? Object.entries(summary.byStream).map(([stream, v]) => ({
        id: stream,
        stream,
        count: v.count,
        gross: formatNgn(v.grossKobo),
        net: formatNgn(v.netKobo),
      }))
    : [];

  const cityRows = summary
    ? Object.entries(summary.byCity).map(([city, v]) => ({
        id: city,
        city,
        count: v.count,
        net: formatNgn(v.netKobo),
      }))
    : [];

  const alertRows =
    recon?.alerts.map((a) => ({
      id: a.id,
      kind: a.kind,
      severity: a.severity,
      message: a.message,
      createdAt: a.createdAt,
    })) ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <PageHeader
        title="Finance"
        description="Revenue by stream/city, take rate, MRR, and boost attach (last 30 days)."
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void reloadSummary();
              void reloadRecon();
            }}
          >
            Refresh
          </Button>
        }
      />

      <StatusLine
        loading={summaryLoading}
        error={summaryError}
        empty={!summaryLoading && !summaryError && !summary}
      />

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Take rate"
              value={pct(summary.takeRate)}
              hint={`Net ${formatNgn(summary.netTotalKobo)} / GMV ${formatNgn(summary.gmvKobo)}`}
            />
            <Metric
              label="MRR"
              value={formatNgn(summary.mrr.activeKobo)}
              hint={`${summary.mrr.activeSubs} Plus · net new ${summary.mrr.netNew}`}
            />
            <Metric
              label="Boost attach"
              value={pct(summary.boostAttachRate)}
              hint={`${summary.boostedListings} / ${summary.liveListings} live`}
            />
            <Metric
              label="Gross (window)"
              value={formatNgn(summary.grossTotalKobo)}
              hint={`${summary.windowDays} days`}
            />
          </div>

          <section>
            <h2 className="mb-3 text-lg font-semibold">By stream</h2>
            {streamRows.length ? (
              <SimpleTable
                columns={[
                  { key: "stream", label: "Stream" },
                  { key: "count", label: "Lines" },
                  { key: "gross", label: "Gross" },
                  { key: "net", label: "Net" },
                ]}
                rows={streamRows}
              />
            ) : (
              <p className="text-sm text-[var(--rw-ink-muted)]">No revenue lines.</p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">By city</h2>
            {cityRows.length ? (
              <SimpleTable
                columns={[
                  { key: "city", label: "City" },
                  { key: "count", label: "Lines" },
                  { key: "net", label: "Net" },
                ]}
                rows={cityRows}
              />
            ) : (
              <p className="text-sm text-[var(--rw-ink-muted)]">No city breakdown.</p>
            )}
          </section>
        </>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Reconciliation</h2>
            <p className="mt-1 text-sm text-[var(--rw-ink-muted)]">
              Match revenue ledger lines to PSP references.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={reconBusy}
              onClick={() => void runReconciliation(false)}
            >
              {reconBusy ? "Running…" : "Run reconciliation"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={reconBusy}
              onClick={() => void runReconciliation(true)}
            >
              Inject mismatch
            </Button>
          </div>
        </div>
        {reconMsg ? (
          <p className="text-sm text-[var(--rw-ink-muted)]" role="status">
            {reconMsg}
          </p>
        ) : null}
        <StatusLine loading={reconLoading} error={reconError} />
        {recon?.latest ? (
          <SimpleTable
            columns={[
              { key: "startedAt", label: "Started" },
              { key: "finishedAt", label: "Finished" },
              { key: "matchedCount", label: "Matched" },
              { key: "mismatchCount", label: "Mismatches" },
            ]}
            rows={[
              {
                id: recon.latest.id,
                startedAt: recon.latest.startedAt,
                finishedAt: recon.latest.finishedAt ?? "—",
                matchedCount: recon.latest.matchedCount,
                mismatchCount: recon.latest.mismatchCount,
              },
            ]}
          />
        ) : !reconLoading && !reconError ? (
          <p className="text-sm text-[var(--rw-ink-muted)]">No runs yet.</p>
        ) : null}
        {alertRows.length ? (
          <>
            <h3 className="text-base font-semibold">Open alerts</h3>
            <SimpleTable
              columns={[
                { key: "kind", label: "Kind" },
                { key: "severity", label: "Severity" },
                { key: "message", label: "Message" },
                { key: "createdAt", label: "Created" },
              ]}
              rows={alertRows}
            />
          </>
        ) : null}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--rw-radius-lg)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--rw-ink-muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--rw-ink-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
