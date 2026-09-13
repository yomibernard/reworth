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
import { canSeeFinance, getRoles } from "../../lib/auth";

type Res = {
  items: {
    id: string;
    status: string;
    totalKobo: number;
    listingTitle: string;
    buyerName: string | null;
    sellerName: string | null;
    paymentStatus: string | null;
  }[];
};

export default function OrdersPage() {
  const { data, error, loading, reload } = useAdminQuery<Res>("/admin/orders");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);
  const finance = canSeeFinance(getRoles());

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Orders" description="Transactions and payment trace." />
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !data?.items.length}
      />
      {data?.items.length ? (
        <SimpleTable
          columns={[
            { key: "listingTitle", label: "Listing" },
            { key: "status", label: "Status" },
            { key: "totalKobo", label: "Total (kobo)" },
            { key: "buyerName", label: "Buyer" },
            { key: "sellerName", label: "Seller" },
            { key: "paymentStatus", label: "Payment" },
          ]}
          rows={data.items}
          expandedId={expanded}
          onRowClick={async (row) => {
            const id = String(row.id);
            if (expanded === id) {
              setExpanded(null);
              setDetail(null);
              return;
            }
            setExpanded(id);
            setDetail(await adminFetch(`/admin/orders/${id}`));
          }}
          renderExpanded={(row) => (
            <div className="space-y-3">
              <pre className="max-h-48 overflow-auto rounded bg-[var(--rw-bg)] p-3 text-xs">
                {JSON.stringify(detail, null, 2)}
              </pre>
              {finance ? (
                <ActionButton
                  label="Refund full (confirm)"
                  onClick={async () => {
                    await adminFetch(`/admin/orders/${row.id}/refund`, {
                      method: "POST",
                      body: {
                        amountKobo: row.totalKobo,
                        reason: "Admin refund",
                        confirm: true,
                      },
                    });
                    await reload();
                  }}
                />
              ) : null}
            </div>
          )}
        />
      ) : null}
    </div>
  );
}
