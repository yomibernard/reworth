"use client";

import { useState } from "react";
import { Button } from "@reworth/ui-web";
import { adminFetch } from "../../lib/api";
import {
  PageHeader,
  SimpleTable,
  StatusLine,
  useAdminQuery,
} from "../../components/AdminUi";

type ListRes = { items: Record<string, unknown>[] };

export default function CatalogPage() {
  const [tab, setTab] = useState<
    "categories" | "meet-points" | "chat-scan-rules" | "hero-banners" | "communities"
  >("categories");
  const path =
    tab === "categories"
      ? "/admin/categories"
      : tab === "meet-points"
        ? "/admin/meet-points"
        : tab === "chat-scan-rules"
          ? "/admin/chat-scan-rules"
          : tab === "hero-banners"
            ? "/admin/hero-banners"
            : "/admin/communities";
  const { data, error, loading, reload } = useAdminQuery<ListRes>(path);

  const columns =
    tab === "categories"
      ? [
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
          { key: "sortOrder", label: "Order" },
        ]
      : tab === "meet-points"
        ? [
            { key: "name", label: "Name" },
            { key: "community", label: "Community" },
            { key: "landmark", label: "Landmark" },
            { key: "active", label: "Active" },
          ]
        : tab === "chat-scan-rules"
          ? [
              { key: "pattern", label: "Pattern" },
              { key: "kind", label: "Kind" },
              { key: "enabled", label: "Enabled" },
            ]
          : tab === "hero-banners"
            ? [
                { key: "title", label: "Title" },
                { key: "active", label: "Active" },
                { key: "sortOrder", label: "Order" },
              ]
            : [
                { key: "name", label: "Name" },
                { key: "slug", label: "Slug" },
                { key: "active", label: "Active" },
              ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Catalog"
        description="Categories, meet points, scan rules, banners, communities."
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              if (tab === "hero-banners") {
                await adminFetch("/admin/hero-banners", {
                  method: "POST",
                  body: {
                    title: "New banner",
                    body: "Edit me",
                    active: false,
                    sortOrder: 99,
                  },
                });
              } else if (tab === "communities") {
                await adminFetch("/admin/communities", {
                  method: "POST",
                  body: {
                    slug: `community-${Date.now()}`,
                    name: "New community",
                  },
                });
              }
              await reload();
            }}
          >
            Quick create
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            "categories",
            "meet-points",
            "chat-scan-rules",
            "hero-banners",
            "communities",
          ] as const
        ).map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-[var(--rw-radius)] px-3 py-1.5 text-sm ${
              tab === t
                ? "bg-[var(--rw-accent)] text-white"
                : "border border-[var(--rw-border)]"
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !data?.items.length}
      />
      {data?.items.length ? (
        <SimpleTable columns={columns} rows={data.items} />
      ) : null}
    </div>
  );
}
