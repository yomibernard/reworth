"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatNgn } from "@reworth/shared";
import {
  Button,
  Chip,
  EmptyState,
  Modal,
  Skeleton,
  Toast,
} from "@reworth/ui-web";
import { ApiError, apiFetch } from "../../../lib/api";
import { getAccessToken } from "../../../lib/auth";
import {
  cancelOrder,
  confirmReceipt,
  DISPUTE_REASONS,
  disputeIdFromEvents,
  fulfilmentLabel,
  getOrder,
  markHandedOver,
  openDispute,
  orderStatusLabel,
  paymentStatusFromOrder,
  refundStatusFromOrder,
  type DisputeReason,
  type OrderDetail,
} from "../../../lib/orders";
import type { MeResponse } from "../../../lib/types";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] =
    useState<DisputeReason>("NEVER_RECEIVED");
  const [disputeDetail, setDisputeDetail] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    tone?: "info" | "success" | "warn" | "error";
  } | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    const token = getAccessToken();
    if (!token) {
      router.replace("/onboarding");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [me, detail] = await Promise.all([
        apiFetch<MeResponse>("/me", { token }),
        getOrder(token, orderId),
      ]);
      setMeId(me.id);
      setOrder(detail);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/onboarding");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Order not found");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(
    action: "handed-over" | "confirm" | "cancel",
  ) {
    const token = getAccessToken();
    if (!token || !orderId) return;
    setBusy(true);
    try {
      if (action === "handed-over") await markHandedOver(token, orderId);
      else if (action === "confirm") await confirmReceipt(token, orderId);
      else await cancelOrder(token, orderId);
      setToast({ message: "Updated", tone: "success" });
      await load();
    } catch (err) {
      setToast({
        message: err instanceof ApiError ? err.message : "Action failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function submitDispute(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token || !orderId) return;
    setBusy(true);
    try {
      const d = await openDispute(token, orderId, {
        reason: disputeReason,
        detail: disputeDetail.trim() || undefined,
      });
      setDisputeOpen(false);
      setToast({ message: "Dispute opened", tone: "success" });
      router.push(`/disputes/${d.id}`);
    } catch (err) {
      setToast({
        message: err instanceof ApiError ? err.message : "Could not open dispute",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-[100dvh] bg-[var(--rw-bg)] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--rw-bg)] px-6">
        <EmptyState
          title="Order unavailable"
          description={error ?? "Not found"}
          action={
            <Link href="/orders">
              <Button variant="primary">All orders</Button>
            </Link>
          }
        />
      </main>
    );
  }

  const isBuyer = meId === order.buyerId;
  const isSeller = meId === order.sellerId;
  const disputeId = disputeIdFromEvents(order.events);
  const canCancel =
    isBuyer &&
    (order.status === "CREATED" || order.status === "PAYMENT_PENDING");
  const canHandOver = isSeller && order.status === "FUNDED";
  const canConfirm = isBuyer && order.status === "HANDED_OVER";
  const canDispute =
    isBuyer &&
    (order.status === "RECEIVED" || order.status === "COMPLETED") &&
    !disputeId;

  return (
    <main className="relative min-h-[100dvh] bg-[var(--rw-bg)] text-[var(--rw-ink)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28vh]"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(14,159,110,0.1), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/orders"
            className="text-sm font-medium text-[var(--rw-ink-muted)] underline-offset-2 hover:underline"
          >
            ← Orders
          </Link>
          <span className="text-xl font-semibold tracking-tight">ReWorth</span>
        </header>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {formatNgn({ amountKobo: order.totalKobo })}
            </h1>
            <p className="mt-1 text-sm text-[var(--rw-ink-muted)]">
              {isBuyer ? "Buying" : isSeller ? "Selling" : "Order"} ·{" "}
              {fulfilmentLabel(String(order.fulfilmentMethod))}
            </p>
          </div>
          <Chip selected className="pointer-events-none">
            {orderStatusLabel(String(order.status))}
          </Chip>
        </div>

        <dl className="mt-6 grid gap-3 rounded-[var(--rw-radius-lg)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--rw-ink-muted)]">Item</dt>
            <dd className="font-medium">
              {formatNgn({ amountKobo: order.amountKobo })}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--rw-ink-muted)]">Protection fee</dt>
            <dd className="font-medium">
              {formatNgn({ amountKobo: order.protectionFeeKobo })}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--rw-ink-muted)]">Payment</dt>
            <dd className="font-medium">{paymentStatusFromOrder(order)}</dd>
          </div>
          <div>
            <dt className="text-[var(--rw-ink-muted)]">Refund</dt>
            <dd className="font-medium">{refundStatusFromOrder(order)}</dd>
          </div>
        </dl>

        {order.buyerProtection ? (
          <aside className="mt-4 rounded-[var(--rw-radius-lg)] border border-[var(--rw-accent)]/30 bg-[var(--rw-accent-muted)]/40 px-4 py-3 text-sm">
            <p className="font-semibold text-[var(--rw-accent)]">
              Buyer protection active
            </p>
            {order.coverageEndsAt ? (
              <p className="mt-1 text-[var(--rw-ink-muted)]">
                Coverage until{" "}
                {new Date(order.coverageEndsAt).toLocaleString("en-NG")}
              </p>
            ) : null}
          </aside>
        ) : null}

        {disputeId ? (
          <p className="mt-4">
            <Link
              href={`/disputes/${disputeId}`}
              className="text-sm font-semibold text-[var(--rw-accent)] underline-offset-2 hover:underline"
            >
              View dispute →
            </Link>
          </p>
        ) : null}

        <section className="mt-8" aria-labelledby="timeline-heading">
          <h2 id="timeline-heading" className="text-lg font-semibold">
            Timeline
          </h2>
          <ol className="mt-4 space-y-0 border-l-2 border-[var(--rw-border)] pl-4">
            {order.events.map((ev) => (
              <li key={ev.id} className="relative pb-5 last:pb-0">
                <span
                  aria-hidden
                  className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--rw-accent)]"
                />
                <p className="text-sm font-medium">
                  {orderStatusLabel(ev.type) === ev.type
                    ? ev.type.replace(/_/g, " ")
                    : orderStatusLabel(ev.type)}
                </p>
                <time
                  className="text-xs text-[var(--rw-ink-muted)]"
                  dateTime={ev.createdAt}
                >
                  {new Date(ev.createdAt).toLocaleString("en-NG")}
                </time>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-8 flex flex-wrap gap-2">
          {canHandOver ? (
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => void runAction("handed-over")}
            >
              Mark handed over
            </Button>
          ) : null}
          {canConfirm ? (
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => void runAction("confirm")}
            >
              Confirm receipt
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void runAction("cancel")}
            >
              Cancel order
            </Button>
          ) : null}
          {canDispute ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setDisputeOpen(true)}
            >
              Open dispute
            </Button>
          ) : null}
          {order.status === "PAYMENT_PENDING" && isBuyer ? (
            <Link href={`/checkout?listingId=${order.listingId}`}>
              <Button variant="secondary">Resume payment</Button>
            </Link>
          ) : null}
        </div>
      </div>

      <Modal
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        title="Open dispute"
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => void submitDispute(e)}>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Reason</legend>
            <div className="flex flex-wrap gap-2">
              {DISPUTE_REASONS.map((r) => (
                <Chip
                  key={r.value}
                  selected={disputeReason === r.value}
                  onClick={() => setDisputeReason(r.value)}
                >
                  {r.label}
                </Chip>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dispute-detail" className="text-sm font-medium">
              Details (optional)
            </label>
            <textarea
              id="dispute-detail"
              value={disputeDetail}
              onChange={(e) => setDisputeDetail(e.target.value)}
              rows={3}
              maxLength={4000}
              className="w-full rounded-[var(--rw-radius)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)]"
            />
          </div>
          <Button type="submit" variant="danger" disabled={busy}>
            {busy ? "Submitting…" : "Submit dispute"}
          </Button>
        </form>
      </Modal>

      {toast ? (
        <div className="fixed bottom-8 left-1/2 z-50 w-[min(100%-2rem,24rem)] -translate-x-1/2">
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
