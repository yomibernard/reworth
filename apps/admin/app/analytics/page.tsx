"use client";

import Link from "next/link";
import { Button } from "@reworth/ui-web";
import { downloadCsv } from "../../lib/api";
import {
  PageHeader,
  SimpleTable,
  StatusLine,
  useAdminQuery,
} from "../../components/AdminUi";

type Res = {
  from: string;
  to: string;
  community: string | null;
  rows: { metric: string; value: number }[];
};

export default function AnalyticsPage() {
  const { data, error, loading } = useAdminQuery<Res>("/admin/analytics");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Analytics"
        description="Table metrics for the selected window. Revenue take-rate, MRR, and boost attach live under Finance."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void downloadCsv("/admin/analytics/export.csv", "analytics.csv")
              }
            >
              Export CSV
            </Button>
            <Link
              href="/finance"
              className="text-sm font-medium text-[var(--rw-accent)] underline-offset-2 hover:underline"
            >
              Finance metrics →
            </Link>
          </div>
        }
      />
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !data?.rows.length}
      />
      {data?.rows.length ? (
        <SimpleTable
          columns={[
            { key: "metric", label: "Metric" },
            { key: "value", label: "Value" },
          ]}
          rows={data.rows.map((r) => ({ id: r.metric, ...r }))}
        />
      ) : null}
    </div>
  );
}
