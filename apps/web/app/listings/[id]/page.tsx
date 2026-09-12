"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatNgn } from "@reworth/shared";
import {
  Button,
  EmptyState,
  Input,
  Modal,
  Skeleton,
  Toast,
} from "@reworth/ui-web";
import { ApiError } from "../../../lib/api";
import { getAccessToken } from "../../../lib/auth";
import {
  CONDITION_LABELS,
  formatPostedAt,
  getListing,
  listingImageUrl,
  reportListing,
} from "../../../lib/listings";
import type { PublicListing } from "../../../lib/types";

export default function ListingPdpPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [listing, setListing] = useState<PublicListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    tone?: "info" | "success" | "warn" | "error";
  } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetail, setReportDetail] = useState("");
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const data = await getListing(id, token);
      setListing(data);
      setActiveImage(0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Listing not found");
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function comingSoon(label: string) {
    setToast({ message: `${label} — Coming soon`, tone: "info" });
  }

  async function shareListing() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: listing?.title ?? "ReWorth listing",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast({ message: "Link copied", tone: "success" });
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setToast({ message: "Link copied", tone: "success" });
      } catch {
        setToast({ message: "Could not copy link", tone: "error" });
      }
    }
  }

  async function submitReport() {
    const token = getAccessToken();
    if (!token) {
      setToast({ message: "Sign in to report a listing", tone: "warn" });
      setReportOpen(false);
      return;
    }
    if (!reportReason.trim() || !id) {
      setToast({ message: "Add a reason", tone: "warn" });
      return;
    }
    setReporting(true);
    try {
      await reportListing(id, token, reportReason.trim(), reportDetail.trim());
      setReportOpen(false);
      setReportReason("");
      setReportDetail("");
      setToast({ message: "Report submitted", tone: "success" });
    } catch (err) {
      setToast({
        message: err instanceof ApiError ? err.message : "Report failed",
        tone: "error",
      });
    } finally {
      setReporting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-[100dvh] bg-[var(--rw-bg)] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="aspect-[4/3] w-full" label="Loading gallery" />
          <Skeleton className="h-8 w-1/2" label="Loading price" />
          <Skeleton className="h-6 w-3/4" label="Loading title" />
          <Skeleton className="h-32 w-full" label="Loading details" />
        </div>
      </main>
    );
  }

  if (error || !listing) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--rw-bg)] px-6">
        <EmptyState
          title="Listing unavailable"
          description={error ?? "This item may have been removed."}
          action={
            <Link href="/">
              <Button variant="primary">Back home</Button>
            </Link>
          }
        />
      </main>
    );
  }

  const images = [...listing.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const heroUrl = listingImageUrl(images[activeImage]) ?? listingImageUrl(images[0]);
  const isSwap =
    listing.sellingMode === "SWAP" || listing.sellingMode === "SWAP_CASH";
  const isGiveAway = listing.sellingMode === "GIVE_AWAY";
  const posted = formatPostedAt(listing.publishedAt ?? listing.createdAt);

  const fulfilment: string[] = [];
  if (listing.fulfilmentPickup) fulfilment.push("Pickup");
  if (listing.fulfilmentMeet) fulfilment.push("Meet point");
  if (listing.fulfilmentDelivery) fulfilment.push("Delivery (quote at checkout)");

  return (
    <main className="relative min-h-[100dvh] bg-[var(--rw-bg)] text-[var(--rw-ink)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[40vh]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(14,159,110,0.12), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)]"
          >
            ReWorth
          </Link>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="text-sm font-medium text-[var(--rw-ink-muted)] underline-offset-2 hover:underline"
          >
            Report
          </button>
        </header>

        <section aria-label="Photo gallery" className="rw-fade-up">
          <div className="aspect-[4/3] overflow-hidden rounded-[var(--rw-radius-lg)] bg-[var(--rw-border)]">
            {heroUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--rw-ink-muted)]">
                No photos yet
              </div>
            )}
          </div>
          {images.length > 1 ? (
            <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => {
                const thumb = listingImageUrl(img);
                return (
                  <li key={img.id}>
                    <button
                      type="button"
                      onClick={() => setActiveImage(i)}
                      aria-label={`Photo ${i + 1}`}
                      aria-pressed={activeImage === i}
                      className={[
                        "h-16 w-16 overflow-hidden rounded-[var(--rw-radius)] border-2",
                        activeImage === i
                          ? "border-[var(--rw-accent)]"
                          : "border-transparent",
                      ].join(" ")}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        <section className="rw-fade-up-delay mt-8">
          <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {isGiveAway
              ? "Free"
              : isSwap
                ? "Swap"
                : formatNgn({ amountKobo: listing.priceKobo })}
            {!isGiveAway && !isSwap && listing.negotiable ? (
              <span className="ml-2 text-base font-medium text-[var(--rw-ink-muted)]">
                · Negotiable
              </span>
            ) : null}
          </p>
          <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
            {listing.title || "Untitled listing"}
          </h1>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--rw-ink-muted)]">
            <span>
              {CONDITION_LABELS[listing.condition] ?? listing.condition}
            </span>
            <span aria-hidden>·</span>
            <span>{listing.community || "Lagos"}</span>
            <span aria-hidden>·</span>
            <time dateTime={listing.publishedAt ?? listing.createdAt}>
              {posted}
            </time>
          </p>
        </section>

        <section
          className="mt-8 flex items-center gap-4 rounded-[var(--rw-radius-lg)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)]/90 p-4"
          aria-label="Seller"
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--rw-accent-muted)] text-lg font-semibold text-[var(--rw-accent)]"
            aria-hidden
          >
            {(listing.seller.displayName || "S").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {listing.seller.displayName}
              {listing.seller.verificationBadge ? (
                <span className="ml-2 text-sm font-medium text-[var(--rw-accent)]">
                  Verified
                </span>
              ) : null}
            </p>
            <p className="text-sm text-[var(--rw-ink-muted)]">
              Rating · {listing.seller.ratingLabel}
            </p>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="pdp-desc">
          <h2 id="pdp-desc" className="text-lg font-semibold">
            Description
          </h2>
          <p className="mt-3 whitespace-pre-wrap leading-relaxed text-[var(--rw-ink-muted)]">
            {listing.description || "No description provided."}
          </p>
        </section>

        <section className="mt-8" aria-labelledby="pdp-delivery">
          <h2 id="pdp-delivery" className="text-lg font-semibold">
            Delivery options
          </h2>
          {fulfilment.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {fulfilment.map((f) => (
                <li
                  key={f}
                  className="rounded-full border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-3 py-1.5 text-sm"
                >
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--rw-ink-muted)]">
              Seller has not set fulfilment options.
            </p>
          )}
        </section>

        {listing.buyerProtection ? (
          <aside
            className="mt-8 rounded-[var(--rw-radius-lg)] border border-[var(--rw-accent)]/30 bg-[var(--rw-accent-muted)]/50 px-4 py-3"
            aria-label="Buyer protection"
          >
            <p className="text-sm font-semibold text-[var(--rw-accent)]">
              Buyer protection
            </p>
            <p className="mt-1 text-sm text-[var(--rw-ink-muted)]">
              Pay on ReWorth when available — funds held until you confirm.
            </p>
          </aside>
        ) : null}

        {isSwap ? (
          <p className="mt-8 text-center text-sm font-medium text-[var(--rw-ink-muted)]">
            Interested in swapping? Chat with the seller
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--rw-border)] bg-[var(--rw-bg-elevated)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2 px-4 py-3 sm:px-8">
          {isSwap ? (
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => comingSoon("Chat")}
            >
              Chat
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => comingSoon("Make offer")}
              >
                Make offer
              </Button>
              {!isGiveAway ? (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => comingSoon("Buy now")}
                >
                  Buy now
                </Button>
              ) : null}
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => comingSoon("Chat")}
              >
                Chat
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => comingSoon("Save")}
            aria-label="Save listing"
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void shareListing()}
            aria-label="Share listing"
          >
            Share
          </Button>
        </div>
      </div>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report listing"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Reason"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Spam, scam, prohibited…"
            maxLength={200}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-detail" className="text-sm font-medium">
              Details (optional)
            </label>
            <textarea
              id="report-detail"
              value={reportDetail}
              onChange={(e) => setReportDetail(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-[var(--rw-radius)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)]"
            />
          </div>
          <Button
            variant="danger"
            disabled={reporting}
            onClick={() => void submitReport()}
          >
            {reporting ? "Sending…" : "Submit report"}
          </Button>
        </div>
      </Modal>

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 w-[min(100%-2rem,24rem)] -translate-x-1/2">
          <Toast
            message={toast.message}
            tone={toast.tone}
            onDismiss={() => setToast(null)}
          />
        </div>
      ) : null}
    </main>
  );
}
