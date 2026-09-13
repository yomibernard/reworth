"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, EmptyState, Skeleton, Toast } from "@reworth/ui-web";
import { ApiError } from "../../../../lib/api";
import { getAccessToken } from "../../../../lib/auth";
import {
  approveGiveawayClaim,
  listGiveawayClaims,
  rejectGiveawayClaim,
  type GiveawayClaim,
} from "../../../../lib/swap";

export default function GiveawayClaimsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [items, setItems] = useState<GiveawayClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await listGiveawayClaims(token, id);
      setItems(res.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(claimId: string, approve: boolean) {
    const token = getAccessToken();
    if (!token) return;
    setBusyId(claimId);
    try {
      if (approve) await approveGiveawayClaim(token, claimId);
      else await rejectGiveawayClaim(token, claimId);
      setToast(approve ? "Claimant approved" : "Claim rejected");
      await load();
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-lg px-4 py-8">
      <Link href={id ? `/listings/${id}` : "/"} className="text-sm text-[var(--rw-ink-muted)]">
        ← Back to listing
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Give-away claims</h1>
      <p className="mt-1 text-sm text-[var(--rw-ink-muted)]">
        Approve one claimant. Others are notified and released.
      </p>
      {loading ? (
        <Skeleton className="mt-6 h-24 w-full" />
      ) : items.length === 0 ? (
        <EmptyState className="mt-8" title="No claims yet" description="Share your listing to get claimants." />
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-[var(--rw-border)] p-4"
            >
              <div className="font-medium">
                {c.claimant?.profile?.displayName ?? c.claimantId.slice(0, 8)}
              </div>
              <div className="text-xs text-[var(--rw-ink-muted)]">{c.status}</div>
              {c.note ? <p className="mt-2 text-sm">{c.note}</p> : null}
              {c.status === "CLAIMED" ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busyId === c.id}
                    onClick={() => void act(c.id, true)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === c.id}
                    onClick={() => void act(c.id, false)}
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {toast ? <Toast message={toast} tone="info" /> : null}
    </main>
  );
}
