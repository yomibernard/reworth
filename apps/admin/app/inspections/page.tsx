"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@reworth/ui-web";
import { adminFetch, ApiError } from "../../lib/api";
import {
  PageHeader,
  SimpleTable,
  StatusLine,
} from "../../components/AdminUi";

type InspectionRow = {
  id: string;
  listingId: string;
  status: string;
  feeKobo?: number;
  scheduledAt?: string | null;
  completedAt?: string | null;
  conditionScore?: number | null;
  listingTitle?: string | null;
  requesterId?: string;
  createdAt?: string;
};

export default function AdminInspectionsPage() {
  const [items, setItems] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter
        ? `?status=${encodeURIComponent(statusFilter)}`
        : "";
      const res = await adminFetch<{ items: InspectionRow[] } | InspectionRow[]>(
        `/admin/inspections${qs}`,
      );
      setItems(Array.isArray(res) ? res : res.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = items.map((r) => ({
    id: r.id,
    listing: r.listingTitle || r.listingId.slice(0, 8),
    status: r.status,
    feeKobo: r.feeKobo ?? "—",
    score: r.conditionScore ?? "—",
    scheduledAt: r.scheduledAt
      ? new Date(r.scheduledAt).toLocaleString("en-NG")
      : "—",
    completedAt: r.completedAt
      ? new Date(r.completedAt).toLocaleString("en-NG")
      : "—",
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Inspections"
        description="Vehicle inspection partner jobs."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-[var(--rw-ink-muted)]">
              Status{" "}
              <select
                className="ml-1 rounded border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-2 py-1 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="REQUESTED">Requested</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </label>
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
          </div>
        }
      />
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !rows.length}
      />
      {rows.length ? (
        <SimpleTable
          columns={[
            { key: "listing", label: "Listing" },
            { key: "status", label: "Status" },
            { key: "feeKobo", label: "Fee (kobo)" },
            { key: "score", label: "Score" },
            { key: "scheduledAt", label: "Scheduled" },
            { key: "completedAt", label: "Completed" },
          ]}
          rows={rows}
        />
      ) : null}
    </div>
  );
}
