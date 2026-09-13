"use client";

import { PageHeader, SimpleTable, StatusLine, useAdminQuery } from "../../components/AdminUi";

type Res = {
  items: {
    id: string;
    kind: string;
    feeKobo: number;
    startsAt: string;
    endsAt: string;
    listing?: { title?: string };
  }[];
};

export default function PromotionsPage() {
  const { data, error, loading } = useAdminQuery<Res>("/admin/promotions");
  const rows =
    data?.items.map((p) => ({
      id: p.id,
      kind: p.kind,
      listing: p.listing?.title ?? "—",
      feeKobo: p.feeKobo,
      startsAt: p.startsAt,
      endsAt: p.endsAt,
    })) ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Promotions"
        description="Featured / boost campaigns (create via listing Feature action)."
      />
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !rows.length}
      />
      {rows.length ? (
        <SimpleTable
          columns={[
            { key: "kind", label: "Kind" },
            { key: "listing", label: "Listing" },
            { key: "feeKobo", label: "Fee (kobo)" },
            { key: "startsAt", label: "Starts" },
            { key: "endsAt", label: "Ends" },
          ]}
          rows={rows}
        />
      ) : null}
    </div>
  );
}
