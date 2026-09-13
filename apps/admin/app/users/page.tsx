"use client";

import { useState } from "react";
import { Button } from "@reworth/ui-web";
import { adminFetch, downloadCsv } from "../../lib/api";
import {
  ActionButton,
  PageHeader,
  SimpleTable,
  StatusLine,
  useAdminQuery,
} from "../../components/AdminUi";

type UsersRes = {
  items: {
    id: string;
    email: string | null;
    phone: string | null;
    status: string;
    displayName: string | null;
    community: string | null;
    roles: string[];
    createdAt: string;
  }[];
};

export default function UsersPage() {
  const [q, setQ] = useState("");
  const path = `/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`;
  const { data, error, loading, reload } = useAdminQuery<UsersRes>(path);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Users"
        description="Lookup, suspend, and export."
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void downloadCsv("/admin/users/export.csv", "users.csv")}
            >
              Export CSV
            </Button>
          </div>
        }
      />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void reload();
        }}
      >
        <input
          className="flex-1 rounded-[var(--rw-radius)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-3 py-2 text-sm"
          placeholder="Search email, phone, name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" size="sm">
          Search
        </Button>
      </form>
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !data?.items.length}
      />
      {data?.items.length ? (
        <SimpleTable
          columns={[
            { key: "displayName", label: "Name" },
            { key: "email", label: "Email" },
            { key: "status", label: "Status" },
            { key: "community", label: "Community" },
            { key: "roles", label: "Roles" },
          ]}
          rows={data.items.map((u) => ({
            ...u,
            roles: u.roles.join(", "),
          }))}
          expandedId={expanded}
          onRowClick={(row) =>
            setExpanded(expanded === String(row.id) ? null : String(row.id))
          }
          renderExpanded={(row) => (
            <div className="flex flex-wrap gap-2">
              <ActionButton
                label="Suspend"
                onClick={async () => {
                  await adminFetch(`/admin/users/${row.id}/suspend`, {
                    method: "POST",
                    body: { reason: "Admin action" },
                  });
                  await reload();
                }}
              />
              <ActionButton
                label="Unsuspend"
                onClick={async () => {
                  await adminFetch(`/admin/users/${row.id}/unsuspend`, {
                    method: "POST",
                  });
                  await reload();
                }}
              />
              <ActionButton
                label="Reset verification"
                onClick={async () => {
                  await adminFetch(
                    `/admin/users/${row.id}/reset-verification`,
                    { method: "POST" },
                  );
                  await reload();
                }}
              />
              <ActionButton
                label="Whitelist"
                onClick={async () => {
                  await adminFetch(`/admin/users/${row.id}/whitelist`, {
                    method: "POST",
                    body: { reason: "Trusted seller" },
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
