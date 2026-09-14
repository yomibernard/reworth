"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input } from "@reworth/ui-web";
import { adminFetch, ApiError } from "../../lib/api";
import {
  ActionButton,
  PageHeader,
  SimpleTable,
  StatusLine,
} from "../../components/AdminUi";

type CorporateRow = {
  id: string;
  companyName: string;
  billingContact?: string;
  billingEmail?: string;
  status: string;
  supportTier?: string;
  createdAt?: string;
};

type ProjectRow = {
  id: string;
  title: string;
  employeeName?: string;
  status: string;
  cityFrom?: string;
  cityTo?: string;
  corporateAccountId?: string;
  companyName?: string;
  deadline?: string;
  itemCount?: number;
};

export default function AdminCorporatePage() {
  const [accounts, setAccounts] = useState<CorporateRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("APPLIED");
  const [selected, setSelected] = useState<CorporateRow | null>(null);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter
        ? `?status=${encodeURIComponent(statusFilter)}`
        : "";
      const [accRes, projRes] = await Promise.all([
        adminFetch<{ items: CorporateRow[] } | CorporateRow[]>(
          `/admin/corporate${qs}`,
        ),
        adminFetch<{ items: ProjectRow[] } | ProjectRow[]>(
          "/admin/corporate/projects",
        ).catch(() => [] as ProjectRow[]),
      ]);
      setAccounts(Array.isArray(accRes) ? accRes : accRes.items ?? []);
      setProjects(Array.isArray(projRes) ? projRes : projRes.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
      setAccounts([]);
      setProjects([]);
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
      await adminFetch(`/admin/corporate/${id}/${action}`, {
        method: "POST",
        body: notes.trim() ? { notes: notes.trim() } : {},
      });
      setSelected(null);
      setNotes("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `${action} failed`);
    } finally {
      setBusyId(null);
    }
  }

  const accountRows = accounts.map((a) => ({
    id: a.id,
    company: a.companyName,
    contact: a.billingContact || a.billingEmail || "—",
    status: a.status,
    createdAt: a.createdAt
      ? new Date(a.createdAt).toLocaleDateString("en-NG")
      : "—",
  }));

  const projectRows = projects.map((p) => ({
    id: p.id,
    title: p.title,
    employee: p.employeeName || "—",
    company: p.companyName || p.corporateAccountId?.slice(0, 8) || "—",
    route: `${p.cityFrom ?? "?"} → ${p.cityTo ?? "?"}`,
    status: p.status,
    items: String(p.itemCount ?? "—"),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <div>
        <PageHeader
          title="Corporate accounts"
          description="Approve corporate relocation accounts and oversee projects."
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
                  <option value="SUSPENDED">Suspended</option>
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
          empty={!loading && !error && !accountRows.length}
        />
        {accountRows.length ? (
          <SimpleTable
            columns={[
              { key: "company", label: "Company" },
              { key: "contact", label: "Contact" },
              { key: "status", label: "Status" },
              { key: "createdAt", label: "Applied" },
            ]}
            rows={accountRows}
            onRowClick={(row) => {
              const found = accounts.find((i) => i.id === row.id);
              setSelected(found ?? null);
            }}
            expandedId={selected?.id ?? null}
            renderExpanded={() =>
              selected && selected.status === "APPLIED" ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Input
                      label="Review notes (optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
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
                </div>
              ) : (
                <p className="text-sm text-[var(--rw-ink-muted)]">
                  {selected?.billingEmail
                    ? `${selected.companyName} · ${selected.billingEmail}`
                    : "Select an APPLIED row to approve or reject."}
                </p>
              )
            }
          />
        ) : null}
      </div>

      <div>
        <PageHeader
          title="Relocation projects"
          description="Cross-account oversight of active and completed moves."
        />
        {!projectRows.length && !loading ? (
          <p className="text-sm text-[var(--rw-ink-muted)]">No projects yet.</p>
        ) : null}
        {projectRows.length ? (
          <SimpleTable
            columns={[
              { key: "title", label: "Project" },
              { key: "employee", label: "Employee" },
              { key: "company", label: "Company" },
              { key: "route", label: "Route" },
              { key: "status", label: "Status" },
              { key: "items", label: "Items" },
            ]}
            rows={projectRows}
          />
        ) : null}
      </div>
    </div>
  );
}
