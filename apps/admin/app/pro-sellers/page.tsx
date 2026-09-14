"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@reworth/ui-web";
import { adminFetch, ApiError } from "../../lib/api";
import {
  ActionButton,
  PageHeader,
  SimpleTable,
  StatusLine,
} from "../../components/AdminUi";

type ProSellerRow = {
  id: string;
  userId?: string;
  status: string;
  businessName: string;
  handle?: string | null;
  subscriptionStatus?: string;
  createdAt?: string;
  displayName?: string | null;
  email?: string | null;
};

export default function AdminProSellersPage() {
  const [items, setItems] = useState<ProSellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("APPLIED");
  const [selected, setSelected] = useState<ProSellerRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter
        ? `?status=${encodeURIComponent(statusFilter)}`
        : "";
      const res = await adminFetch<{ items: ProSellerRow[] } | ProSellerRow[]>(
        `/admin/pro-sellers${qs}`,
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

  async function decide(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      await adminFetch(`/admin/pro-sellers/${id}/${action}`, {
        method: "POST",
        body: {},
      });
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `${action} failed`);
    } finally {
      setBusyId(null);
    }
  }

  const rows = items.map((p) => ({
    id: p.id,
    business: p.businessName,
    handle: p.handle ? `@${p.handle}` : "—",
    status: p.status,
    user: p.displayName || p.email || p.userId?.slice(0, 8) || "—",
    createdAt: p.createdAt
      ? new Date(p.createdAt).toLocaleDateString("en-NG")
      : "—",
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Pro sellers"
        description="Application queue — approve or reject business seller accounts."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-[var(--rw-ink-muted)]">
              Status{" "}
              <select
                className="ml-1 rounded border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-2 py-1 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="APPLIED">Applied</option>
                <option value="APPROVED">Approved</option>
                <option value="ACTIVE">Active</option>
                <option value="REJECTED">Rejected</option>
                <option value="">All</option>
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
            { key: "business", label: "Business" },
            { key: "handle", label: "Handle" },
            { key: "user", label: "User" },
            { key: "status", label: "Status" },
            { key: "createdAt", label: "Applied" },
          ]}
          rows={rows}
          onRowClick={(row) => {
            const found = items.find((i) => i.id === row.id);
            setSelected(found ?? null);
          }}
          expandedId={selected?.id ?? null}
          renderExpanded={() =>
            selected && selected.status === "APPLIED" ? (
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  label={busyId === selected.id ? "…" : "Approve"}
                  onClick={() => decide(selected.id, "approve")}
                />
                <ActionButton
                  label="Reject"
                  onClick={() => decide(selected.id, "reject")}
                />
              </div>
            ) : (
              <p>Select an APPLIED row to approve or reject.</p>
            )
          }
        />
      ) : null}
    </div>
  );
}
