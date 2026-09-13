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
    level: string;
    status: string;
    method: string | null;
    user: { profile?: { displayName?: string } | null };
  }[];
};

export default function VerificationsPage() {
  const { data, error, loading, reload } = useAdminQuery<Res>(
    "/admin/verifications?status=PENDING",
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows =
    data?.items.map((v) => ({
      id: v.id,
      level: v.level,
      status: v.status,
      method: v.method,
      user: v.user?.profile?.displayName ?? "—",
    })) ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Verifications" description="Pending L3 identity checks." />
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !rows.length}
      />
      {rows.length ? (
        <SimpleTable
          columns={[
            { key: "user", label: "User" },
            { key: "level", label: "Level" },
            { key: "method", label: "Method" },
            { key: "status", label: "Status" },
          ]}
          rows={rows}
          expandedId={expanded}
          onRowClick={(row) =>
            setExpanded(expanded === String(row.id) ? null : String(row.id))
          }
          renderExpanded={(row) => (
            <div className="flex gap-2">
              <ActionButton
                label="Approve"
                variant="primary"
                onClick={async () => {
                  await adminFetch(`/admin/verifications/${row.id}/approve`, {
                    method: "POST",
                  });
                  await reload();
                }}
              />
              <ActionButton
                label="Reject"
                onClick={async () => {
                  await adminFetch(`/admin/verifications/${row.id}/reject`, {
                    method: "POST",
                    body: { reason: "Documents unclear" },
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
