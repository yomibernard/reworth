"use client";

import {
  PageHeader,
  SimpleTable,
  StatusLine,
  useAdminQuery,
} from "../components/AdminUi";

type Kpis = {
  days: number;
  mau: number;
  newListings: number;
  activeListings: number;
  transactionsCompleted: number;
  gmvKobo: number;
  sellThroughRate: number;
  medianTimeToSaleHours: number | null;
  fraudRate: number;
  openDisputes: number;
  byCommunity: { community: string; listings: number; gmvKobo: number }[];
};

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

export default function AdminHomePage() {
  const { data, error, loading } = useAdminQuery<Kpis>(
    "/admin/dashboard/kpis?days=30",
  );

  const cards = data
    ? [
        { label: "MAU (activity)", value: String(data.mau) },
        { label: "New listings", value: String(data.newListings) },
        { label: "Active listings", value: String(data.activeListings) },
        {
          label: "Completed txns",
          value: String(data.transactionsCompleted),
        },
        { label: "GMV", value: naira(data.gmvKobo) },
        {
          label: "Sell-through",
          value: `${(data.sellThroughRate * 100).toFixed(1)}%`,
        },
        {
          label: "Median time to sale",
          value:
            data.medianTimeToSaleHours == null
              ? "—"
              : `${data.medianTimeToSaleHours.toFixed(1)}h`,
        },
        {
          label: "Fraud rate",
          value: `${(data.fraudRate * 100).toFixed(2)}%`,
        },
        { label: "Open disputes", value: String(data.openDisputes) },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description="Last 30 days marketplace health (PRD §36)."
      />
      <StatusLine loading={loading} error={error} />
      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <div
                key={c.label}
                className="rounded-[var(--rw-radius-lg)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-4 py-4"
              >
                <p className="text-xs uppercase tracking-wide text-[var(--rw-ink-muted)]">
                  {c.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {c.value}
                </p>
              </div>
            ))}
          </div>
          <h2 className="mb-3 mt-10 text-lg font-semibold">By community</h2>
          <SimpleTable
            columns={[
              { key: "community", label: "Community" },
              { key: "listings", label: "Listings" },
              { key: "gmvKobo", label: "GMV (kobo)" },
            ]}
            rows={data.byCommunity.map((r) => ({
              id: r.community,
              ...r,
            }))}
          />
        </>
      ) : null}
    </div>
  );
}
