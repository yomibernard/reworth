"use client";

import type { HTMLAttributes, ReactNode } from "react";

export type ToastTone = "info" | "success" | "warn" | "error";

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  message: string;
  tone?: ToastTone;
  open?: boolean;
  onDismiss?: () => void;
  action?: ReactNode;
  className?: string;
}

const toneStyles: Record<ToastTone, string> = {
  info: "bg-[var(--rw-bg-elevated)] border-[var(--rw-border)] text-[var(--rw-ink)]",
  success:
    "bg-[var(--rw-success-muted)] border-[var(--rw-success)] text-[var(--rw-ink)]",
  warn: "bg-[var(--rw-warn-muted)] border-[var(--rw-warn)] text-[var(--rw-ink)]",
  error:
    "bg-[var(--rw-error-muted)] border-[var(--rw-error)] text-[var(--rw-ink)]",
};

export function Toast({
  message,
  tone = "info",
  open = true,
  onDismiss,
  action,
  className = "",
  role = "status",
  ...rest
}: ToastProps) {
  if (!open) return null;

  return (
    <div
      role={role}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={[
        "flex items-start gap-3 rounded-[var(--rw-radius)] border px-4 py-3 shadow-md",
        toneStyles[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <p className="flex-1 text-sm font-medium">{message}</p>
      {action}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 rounded p-0.5 text-[var(--rw-ink-muted)] hover:text-[var(--rw-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)]"
        >
          <span aria-hidden>×</span>
        </button>
      ) : null}
    </div>
  );
}
