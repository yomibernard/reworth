"use client";

import { PageHeader, SimpleTable, StatusLine, useAdminQuery } from "../../components/AdminUi";

type Res = { items: Record<string, unknown>[] };

export default function DisputesPage() {
  const { data, error, loading } = useAdminQuery<Res>("/admin/disputes");
  const rows =
    data?.items.map((d) => ({
      id: d.id,
      status: d.status,
      reason: d.reason,
      orderId: (d.order as { id?: string } | undefined)?.id,
      createdAt: d.createdAt,
    })) ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Disputes"
        description="Resolution via POST /admin/disputes/:id/resolution."
      />
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !rows.length}
      />
      {rows.length ? (
        <SimpleTable
          columns={[
            { key: "id", label: "ID" },
            { key: "status", label: "Status" },
            { key: "reason", label: "Reason" },
            { key: "orderId", label: "Order" },
            { key: "createdAt", label: "Opened" },
          ]}
          rows={rows}
        />
      ) : null}
    </div>
  );
}
