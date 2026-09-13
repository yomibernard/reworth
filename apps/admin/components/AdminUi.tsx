"use client";

import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@reworth/ui-web";
import { adminFetch, ApiError } from "../lib/api";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--rw-ink-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}

export function useAdminQuery<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch<T>(path);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}

export function StatusLine({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
}) {
  if (loading) {
    return (
      <p className="text-sm text-[var(--rw-ink-muted)]" role="status">
        Loading…
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-[var(--rw-error)]" role="alert">
        {error}
      </p>
    );
  }
  if (empty) {
    return (
      <p className="text-sm text-[var(--rw-ink-muted)]">No rows yet.</p>
    );
  }
  return null;
}

export function SimpleTable({
  columns,
  rows,
  onRowClick,
  expandedId,
  renderExpanded,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  onRowClick?: (row: Record<string, unknown>) => void;
  expandedId?: string | null;
  renderExpanded?: (row: Record<string, unknown>) => ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--rw-radius-lg)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--rw-border)] text-[var(--rw-ink-muted)]">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = String(row.id ?? JSON.stringify(row));
            return (
              <Fragment key={id}>
                <tr
                  className="border-b border-[var(--rw-border)] last:border-0 hover:bg-[var(--rw-accent-muted)]/40"
                  onClick={() => onRowClick?.(row)}
                  style={{ cursor: onRowClick ? "pointer" : undefined }}
                >
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 align-top">
                      {formatCell(row[c.key])}
                    </td>
                  ))}
                </tr>
                {expandedId === id && renderExpanded ? (
                  <tr className="bg-[var(--rw-bg)]">
                    <td
                      colSpan={columns.length}
                      className="px-4 py-4 text-sm text-[var(--rw-ink-muted)]"
                    >
                      {renderExpanded(row)}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(v: unknown): ReactNode {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function ActionButton({
  label,
  onClick,
  variant = "secondary",
}: {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onClick();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "…" : label}
    </Button>
  );
}
