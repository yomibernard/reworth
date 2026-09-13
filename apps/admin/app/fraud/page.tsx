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
    kind: string;
    score: number | null;
    reviewedAt: string | null;
    listing?: { title?: string } | null;
    user?: { profile?: { displayName?: string } | null } | null;
  }[];
};

export default function FraudPage() {
  const { data, error, loading, reload } = useAdminQuery<Res>(
    "/admin/risk-events",
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows =
    data?.items.map((e) => ({
      id: e.id,
      kind: e.kind,
      score: e.score,
      reviewedAt: e.reviewedAt ?? "—",
      listing: e.listing?.title ?? "—",
      user: e.user?.profile?.displayName ?? "—",
    })) ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Fraud" description="Risk events queue." />
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !rows.length}
      />
      {rows.length ? (
        <SimpleTable
          columns={[
            { key: "kind", label: "Kind" },
            { key: "score", label: "Score" },
            { key: "user", label: "User" },
            { key: "listing", label: "Listing" },
            { key: "reviewedAt", label: "Reviewed" },
          ]}
          rows={rows}
          expandedId={expanded}
          onRowClick={(row) =>
            setExpanded(expanded === String(row.id) ? null : String(row.id))
          }
          renderExpanded={(row) => (
            <ActionButton
              label="Mark reviewed"
              variant="primary"
              onClick={async () => {
                await adminFetch(`/admin/risk-events/${row.id}/review`, {
                  method: "POST",
                });
                await reload();
              }}
            />
          )}
        />
      ) : null}
    </div>
  );
}
