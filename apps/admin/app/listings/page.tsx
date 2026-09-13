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
    title: string;
    status: string;
    priceKobo: number;
    community: string;
    sellerName: string | null;
    riskFlags: string[];
  }[];
};

export default function ListingsPage() {
  const [status, setStatus] = useState("UNDER_REVIEW");
  const { data, error, loading, reload } = useAdminQuery<Res>(
    `/admin/listings?status=${status}`,
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Listings" description="Moderation queue." />
      <div className="mb-4 flex gap-2">
        {["UNDER_REVIEW", "LIVE", "REJECTED", "REMOVED"].map((s) => (
          <button
            key={s}
            type="button"
            className={`rounded-[var(--rw-radius)] px-3 py-1.5 text-sm ${
              status === s
                ? "bg-[var(--rw-accent)] text-white"
                : "border border-[var(--rw-border)]"
            }`}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !data?.items.length}
      />
      {data?.items.length ? (
        <SimpleTable
          columns={[
            { key: "title", label: "Title" },
            { key: "status", label: "Status" },
            { key: "priceKobo", label: "Price (kobo)" },
            { key: "community", label: "Community" },
            { key: "sellerName", label: "Seller" },
          ]}
          rows={data.items}
          expandedId={expanded}
          onRowClick={(row) =>
            setExpanded(expanded === String(row.id) ? null : String(row.id))
          }
          renderExpanded={(row) => (
            <div className="flex flex-wrap gap-2">
              <ActionButton
                label="Approve"
                variant="primary"
                onClick={async () => {
                  await adminFetch(`/admin/listings/${row.id}/approve`, {
                    method: "POST",
                  });
                  await reload();
                }}
              />
              <ActionButton
                label="Reject"
                onClick={async () => {
                  await adminFetch(`/admin/listings/${row.id}/reject`, {
                    method: "POST",
                    body: { reason: "Does not meet guidelines" },
                  });
                  await reload();
                }}
              />
              <ActionButton
                label="Remove"
                onClick={async () => {
                  await adminFetch(`/admin/listings/${row.id}/remove`, {
                    method: "POST",
                  });
                  await reload();
                }}
              />
              <ActionButton
                label="Feature 7d"
                onClick={async () => {
                  await adminFetch(`/admin/listings/${row.id}/feature`, {
                    method: "POST",
                    body: { days: 7, feeKobo: 0 },
                  });
                  await reload();
                }}
              />
              <ActionButton
                label="Extend +14d"
                onClick={async () => {
                  await adminFetch(`/admin/listings/${row.id}/extend-expiry`, {
                    method: "POST",
                    body: { days: 14 },
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
