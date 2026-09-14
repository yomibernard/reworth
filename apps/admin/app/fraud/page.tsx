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

type RiskItem = {
  id: string;
  kind: string;
  score: number | null;
  reviewedAt: string | null;
  userId?: string | null;
  listing?: { title?: string } | null;
  user?: {
    id?: string;
    profile?: { displayName?: string } | null;
  } | null;
};

type Res = { items: RiskItem[] };

export default function FraudPage() {
  const { data, error, loading, reload } = useAdminQuery<Res>(
    "/admin/risk-events",
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const rows =
    data?.items.map((e) => ({
      id: e.id,
      kind: e.kind,
      score: e.score,
      reviewedAt: e.reviewedAt ?? "—",
      listing: e.listing?.title ?? "—",
      user: e.user?.profile?.displayName ?? "—",
      userId: e.userId ?? e.user?.id ?? null,
    })) ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Fraud"
        description="Risk-event queue — review, suspend (revokes sessions + notify), or whitelist."
      />
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !rows.length}
      />
      {msg ? (
        <p className="mb-3 text-sm text-[var(--rw-accent)]" role="status">
          {msg}
        </p>
      ) : null}
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
          renderExpanded={(row) => {
            const userId = row.userId as string | null;
            return (
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  label="Mark reviewed"
                  variant="primary"
                  onClick={async () => {
                    await adminFetch(`/admin/risk-events/${row.id}/review`, {
                      method: "POST",
                    });
                    setMsg("Marked reviewed");
                    await reload();
                  }}
                />
                {userId ? (
                  <>
                    <ActionButton
                      label="Suspend user"
                      onClick={async () => {
                        await adminFetch(`/admin/risk-events/${row.id}/review`, {
                          method: "POST",
                        });
                        await adminFetch(`/admin/users/${userId}/suspend`, {
                          method: "POST",
                          body: { reason: "Fraud alert review" },
                        });
                        setMsg(
                          "User suspended — sessions revoked and notification queued",
                        );
                        await reload();
                      }}
                    />
                    <ActionButton
                      label="Whitelist user"
                      onClick={async () => {
                        await adminFetch(`/admin/users/${userId}/whitelist`, {
                          method: "POST",
                          body: { reason: "False positive" },
                        });
                        setMsg("User whitelisted");
                        await reload();
                      }}
                    />
                  </>
                ) : null}
              </div>
            );
          }}
        />
      ) : null}
    </div>
  );
}
