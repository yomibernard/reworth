"use client";

import { useEffect, useState } from "react";
import { formatNgn } from "@reworth/shared";
import { Button, Input, Modal } from "@reworth/ui-web";
import { listingImageUrl } from "../../lib/listings";
import { createSwapProposal, myLiveListings } from "../../lib/swap";
import type { PublicListing } from "../../lib/types";
import { ApiError } from "../../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  token: string;
  targetListingId: string;
  onSubmitted: () => void;
  onNeedListing: () => void;
};

export function SwapProposalModal({
  open,
  onClose,
  token,
  targetListingId,
  onSubmitted,
  onNeedListing,
}: Props) {
  const [mine, setMine] = useState<PublicListing[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [cashNgn, setCashNgn] = useState("0");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    void myLiveListings(token)
      .then((r) => {
        const items = r.items.filter((l) => l.id !== targetListingId);
        setMine(items);
        if (!items.length) {
          /* prompt create */
        }
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load your listings"),
      )
      .finally(() => setLoading(false));
  }, [open, token, targetListingId]);

  async function submit() {
    if (!selected) {
      setError("Pick one of your live listings to offer");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const cashComponentKobo = Math.round(Number(cashNgn || 0) * 100);
      await createSwapProposal(token, targetListingId, {
        offeredListingId: selected,
        cashComponentKobo: Number.isFinite(cashComponentKobo)
          ? cashComponentKobo
          : 0,
        note: note.trim() || undefined,
      });
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Proposal failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Propose a swap">
      <div className="flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-[var(--rw-ink-muted)]">Loading your listings…</p>
        ) : mine.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--rw-ink-muted)]">
              You need a live listing to swap. Create one in about 60 seconds.
            </p>
            <Button variant="primary" onClick={onNeedListing}>
              List an item
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--rw-ink-muted)]">
              Choose what you offer. Add optional cash (₦) you will pay the seller.
            </p>
            <ul className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {mine.map((l) => {
                const thumb = listingImageUrl(l.images?.[0]);
                const active = selected === l.id;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(l.id)}
                      className={`w-full overflow-hidden rounded-lg border text-left ${
                        active
                          ? "border-[var(--rw-accent)] ring-2 ring-[var(--rw-accent)]"
                          : "border-[var(--rw-border)]"
                      }`}
                    >
                      <div className="aspect-square bg-[var(--rw-border)]">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="p-2 text-xs font-medium line-clamp-2">{l.title}</div>
                      <div className="px-2 pb-2 text-xs text-[var(--rw-ink-muted)]">
                        {formatNgn({ amountKobo: l.priceKobo })}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <Input
                label="Cash top-up (₦)"
                value={cashNgn}
                onChange={(e) => setCashNgn(e.target.value)}
                inputMode="decimal"
                className="mt-1"
              />
            <Input
                label="Note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1"
                placeholder="Optional message"
              />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button variant="primary" disabled={busy} onClick={() => void submit()}>
              {busy ? "Sending…" : "Send swap proposal"}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
