"use client";

import { useState } from "react";
import { adminFetch } from "../../lib/api";
import {
  ActionButton,
  PageHeader,
  SimpleTable,
  StatusLine,
  useAdminQuery,
} from "../../components/AdminUi";

type Res = {
  items: {
    id: string;
    reason: string;
    status: string;
    listing?: { title?: string } | null;
    reportedUser?: { profile?: { displayName?: string } | null } | null;
  }[];
};

export default function ReportsPage() {
  const { data, error, loading, reload } = useAdminQuery<Res>("/admin/reports");
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows =
    data?.items.map((r) => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      listing: r.listing?.title ?? "—",
      reportedUser: r.reportedUser?.profile?.displayName ?? "—",
    })) ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Reports" description="Open user/listing reports." />
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !rows.length}
      />
      {rows.length ? (
        <SimpleTable
          columns={[
            { key: "reason", label: "Reason" },
            { key: "listing", label: "Listing" },
            { key: "reportedUser", label: "Reported" },
            { key: "status", label: "Status" },
          ]}
          rows={rows}
          expandedId={expanded}
          onRowClick={(row) =>
            setExpanded(expanded === String(row.id) ? null : String(row.id))
          }
          renderExpanded={(row) => (
            <div className="flex flex-wrap gap-2">
              <ActionButton
                label="Dismiss"
                onClick={async () => {
                  await adminFetch(`/admin/reports/${row.id}/dismiss`, {
                    method: "POST",
                  });
                  await reload();
                }}
              />
              <ActionButton
                label="Warn"
                onClick={async () => {
                  await adminFetch(`/admin/reports/${row.id}/action`, {
                    method: "POST",
                    body: { action: "WARN" },
                  });
                  await reload();
                }}
              />
              <ActionButton
                label="Remove listing"
                onClick={async () => {
                  await adminFetch(`/admin/reports/${row.id}/action`, {
                    method: "POST",
                    body: { action: "REMOVE_LISTING" },
                  });
                  await reload();
                }}
              />
              <ActionButton
                label="Suspend user"
                onClick={async () => {
                  await adminFetch(`/admin/reports/${row.id}/action`, {
                    method: "POST",
                    body: { action: "SUSPEND_USER" },
                  });
                  await reload();
                }}
              />
            </div>
          )}
        />
      ) : null}
    </div>
  );
}
