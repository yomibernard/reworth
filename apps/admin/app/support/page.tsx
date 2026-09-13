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
    subject: string;
    status: string;
    user?: { profile?: { displayName?: string } | null };
    _count?: { notes: number };
  }[];
};

export default function SupportPage() {
  const { data, error, loading, reload } = useAdminQuery<Res>(
    "/admin/support-tickets",
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);

  const rows =
    data?.items.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      user: t.user?.profile?.displayName ?? "—",
      notes: t._count?.notes ?? 0,
    })) ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Support" description="Tickets, notes, and replies." />
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !rows.length}
      />
      {rows.length ? (
        <SimpleTable
          columns={[
            { key: "subject", label: "Subject" },
            { key: "status", label: "Status" },
            { key: "user", label: "User" },
            { key: "notes", label: "Notes" },
          ]}
          rows={rows}
          expandedId={expanded}
          onRowClick={async (row) => {
            const id = String(row.id);
            if (expanded === id) {
              setExpanded(null);
              return;
            }
            setExpanded(id);
            setDetail(await adminFetch(`/admin/support-tickets/${id}`));
          }}
          renderExpanded={(row) => (
            <div className="space-y-3">
              <pre className="max-h-40 overflow-auto rounded bg-[var(--rw-bg)] p-3 text-xs">
                {JSON.stringify(detail, null, 2)}
              </pre>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  label="In progress"
                  onClick={async () => {
                    await adminFetch(`/admin/support-tickets/${row.id}`, {
                      method: "PATCH",
                      body: { status: "IN_PROGRESS" },
                    });
                    await reload();
                  }}
                />
                <ActionButton
                  label="Close"
                  onClick={async () => {
                    await adminFetch(`/admin/support-tickets/${row.id}`, {
                      method: "PATCH",
                      body: { status: "CLOSED" },
                    });
                    await reload();
                  }}
                />
                <ActionButton
                  label="Add internal note"
                  onClick={async () => {
                    await adminFetch(`/admin/support-tickets/${row.id}/notes`, {
                      method: "POST",
                      body: { body: "Internal follow-up", internal: true },
                    });
                    await reload();
                  }}
                />
                <ActionButton
                  label="Respond to user"
                  variant="primary"
                  onClick={async () => {
                    await adminFetch(
                      `/admin/support-tickets/${row.id}/respond`,
                      {
                        method: "POST",
                        body: { body: "Thanks for contacting ReWorth support." },
                      },
                    );
                    await reload();
                  }}
                />
              </div>
            </div>
          )}
        />
      ) : null}
    </div>
  );
}
