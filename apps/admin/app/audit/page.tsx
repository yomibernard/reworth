"use client";

import {
  PageHeader,
  SimpleTable,
  StatusLine,
  useAdminQuery,
} from "../../components/AdminUi";

type Res = {
  items: {
    id: string;
    actorUserId: string | null;
    actorRole: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
  }[];
};

export default function AuditPage() {
  const { data, error, loading } = useAdminQuery<Res>("/admin/audit");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Audit" description="Mutation and access audit trail." />
      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !data?.items.length}
      />
      {data?.items.length ? (
        <SimpleTable
          columns={[
            { key: "createdAt", label: "When" },
            { key: "action", label: "Action" },
            { key: "actorRole", label: "Role" },
            { key: "entityType", label: "Entity" },
            { key: "entityId", label: "Entity ID" },
          ]}
          rows={data.items}
        />
      ) : null}
    </div>
  );
}
