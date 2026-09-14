"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@reworth/ui-web";
import { adminFetch, ApiError } from "../../lib/api";
import {
  ActionButton,
  PageHeader,
  SimpleTable,
  StatusLine,
} from "../../components/AdminUi";

type CommunityRow = {
  id: string;
  slug: string;
  name: string;
  type: string;
  privacy: string;
  verified: boolean;
  active: boolean;
  about: string;
  membershipCount: number;
  listingCount: number;
  managerCount: number;
};

type MembershipRow = {
  id: string;
  userId: string;
  status: string;
  displayName: string | null;
  joinedAt: string | null;
  createdAt: string;
};

type MembershipsRes = {
  communityId: string;
  items: MembershipRow[];
  kpi?: {
    members: number;
    pending: number;
    liveListings: number;
  };
};

export default function AdminCommunitiesPage() {
  const [items, setItems] = useState<CommunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<MembershipsRes | null>(null);
  const [memLoading, setMemLoading] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    name: string;
    privacy: string;
    type: string;
    verified: boolean;
    active: boolean;
    about: string;
  } | null>(null);
  const [managerUserId, setManagerUserId] = useState("");
  const [statusFilter, setStatusFilter] = useState("INVITED");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch<{ items: CommunityRow[] }>(
        "/admin/communities",
      );
      setItems(res.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMemberships = useCallback(
    async (communityId: string, status?: string) => {
      setMemLoading(true);
      try {
        const qs = status ? `?status=${encodeURIComponent(status)}` : "";
        const res = await adminFetch<MembershipsRes>(
          `/admin/communities/${communityId}/memberships${qs}`,
        );
        setMemberships(res);
      } catch (e) {
        setMemberships(null);
        setError(e instanceof ApiError ? e.message : "Memberships failed");
      } finally {
        setMemLoading(false);
      }
    },
    [],
  );

  function selectCommunity(row: CommunityRow) {
    setSelectedId(row.id);
    setEditDraft({
      name: row.name,
      privacy: row.privacy,
      type: row.type,
      verified: row.verified,
      active: row.active,
      about: row.about ?? "",
    });
    void loadMemberships(row.id, statusFilter);
  }

  async function saveEdit() {
    if (!selectedId || !editDraft) return;
    setBusy(true);
    try {
      await adminFetch(`/admin/communities/${selectedId}`, {
        method: "PATCH",
        body: editDraft,
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function membershipAction(
    membershipId: string,
    action: "approve" | "reject" | "suspend",
  ) {
    setBusy(true);
    try {
      await adminFetch(`/admin/memberships/${membershipId}/${action}`, {
        method: "POST",
      });
      if (selectedId) await loadMemberships(selectedId, statusFilter);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function assignManager() {
    if (!selectedId || !managerUserId.trim()) return;
    setBusy(true);
    try {
      await adminFetch(`/admin/communities/${selectedId}/managers`, {
        method: "POST",
        body: { userId: managerUserId.trim() },
      });
      setManagerUserId("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Communities"
        description="Estate communities — privacy, verification, membership queue, managers."
        actions={
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <p className="mb-4 text-sm text-[var(--rw-ink-muted)]">
        Catalog still lists communities for quick create — manage memberships
        here.{" "}
        <Link href="/catalog" className="text-[var(--rw-accent)] underline">
          Open catalog
        </Link>
      </p>

      <StatusLine
        loading={loading}
        error={error}
        empty={!loading && !error && !items.length}
      />

      {items.length ? (
        <SimpleTable
          columns={[
            { key: "name", label: "Name" },
            { key: "type", label: "Type" },
            { key: "privacy", label: "Privacy" },
            { key: "verified", label: "Verified" },
            { key: "membershipCount", label: "Members" },
            { key: "listingCount", label: "Listings" },
          ]}
          rows={items as unknown as Record<string, unknown>[]}
          onRowClick={(row) => {
            const found = items.find((c) => c.id === String(row.id));
            if (found) selectCommunity(found);
          }}
        />
      ) : null}

      {selectedId && editDraft ? (
        <section className="mt-8 space-y-6 rounded-[var(--rw-radius-lg)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] p-4">
          <h2 className="text-lg font-semibold">Edit community</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Name
              <input
                className="mt-1 w-full rounded-[var(--rw-radius)] border border-[var(--rw-border)] px-3 py-2"
                value={editDraft.name}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, name: e.target.value })
                }
              />
            </label>
            <label className="text-sm">
              Type
              <select
                className="mt-1 w-full rounded-[var(--rw-radius)] border border-[var(--rw-border)] px-3 py-2"
                value={editDraft.type}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, type: e.target.value })
                }
              >
                {[
                  "ESTATE",
                  "CORPORATE",
                  "CHURCH",
                  "ALUMNI",
                  "PUBLIC",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Privacy
              <select
                className="mt-1 w-full rounded-[var(--rw-radius)] border border-[var(--rw-border)] px-3 py-2"
                value={editDraft.privacy}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, privacy: e.target.value })
                }
              >
                {["PUBLIC", "SEMI_PRIVATE", "PRIVATE"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input
                type="checkbox"
                checked={editDraft.verified}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, verified: e.target.checked })
                }
              />
              Verified
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editDraft.active}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, active: e.target.checked })
                }
              />
              Active
            </label>
          </div>
          <label className="block text-sm">
            About
            <textarea
              className="mt-1 w-full rounded-[var(--rw-radius)] border border-[var(--rw-border)] px-3 py-2"
              rows={3}
              value={editDraft.about}
              onChange={(e) =>
                setEditDraft({ ...editDraft, about: e.target.value })
              }
            />
          </label>
          <Button
            size="sm"
            variant="primary"
            disabled={busy}
            onClick={() => void saveEdit()}
          >
            Save changes
          </Button>

          <div className="border-t border-[var(--rw-border)] pt-4">
            <h3 className="font-semibold">Assign manager</h3>
            <p className="mt-1 text-xs text-[var(--rw-ink-muted)]">
              OPERATIONS / SUPER_ADMIN only. Paste user UUID.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded-[var(--rw-radius)] border border-[var(--rw-border)] px-3 py-2 text-sm"
                placeholder="User ID"
                value={managerUserId}
                onChange={(e) => setManagerUserId(e.target.value)}
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void assignManager()}
              >
                Assign
              </Button>
            </div>
          </div>

          <div className="border-t border-[var(--rw-border)] pt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">Membership queue</h3>
              <select
                className="rounded-[var(--rw-radius)] border border-[var(--rw-border)] px-2 py-1 text-sm"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  void loadMemberships(selectedId, e.target.value);
                }}
              >
                {["INVITED", "MEMBER", "APPROVED", "SUSPENDED", "LEFT"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ),
                )}
              </select>
              {memberships?.kpi ? (
                <span className="text-xs text-[var(--rw-ink-muted)]">
                  KPI · {memberships.kpi.members} members ·{" "}
                  {memberships.kpi.pending} pending ·{" "}
                  {memberships.kpi.liveListings} live
                </span>
              ) : null}
            </div>
            {memLoading ? (
              <p className="text-sm text-[var(--rw-ink-muted)]">Loading…</p>
            ) : memberships?.items?.length ? (
              <ul className="divide-y divide-[var(--rw-border)]">
                {memberships.items.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {m.displayName ?? m.userId.slice(0, 8)}
                      </p>
                      <p className="text-xs text-[var(--rw-ink-muted)]">
                        {m.status} · {m.userId}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {m.status === "INVITED" ? (
                        <>
                          <ActionButton
                            label="Approve"
                            onClick={() =>
                              void membershipAction(m.id, "approve")
                            }
                          />
                          <ActionButton
                            label="Reject"
                            variant="ghost"
                            onClick={() =>
                              void membershipAction(m.id, "reject")
                            }
                          />
                        </>
                      ) : null}
                      {["MEMBER", "APPROVED"].includes(m.status) ? (
                        <ActionButton
                          label="Suspend"
                          variant="ghost"
                          onClick={() =>
                            void membershipAction(m.id, "suspend")
                          }
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--rw-ink-muted)]">
                No memberships for this filter.
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
