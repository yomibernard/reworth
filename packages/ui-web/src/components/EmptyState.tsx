"use client";

import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={[
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon ? (
        <div className="text-[var(--rw-ink-muted)]" aria-hidden>
          {icon}
        </div>
      ) : null}
      <h2 className="text-lg font-semibold text-[var(--rw-ink)]">{title}</h2>
      {description ? (
        <p className="max-w-sm text-sm text-[var(--rw-ink-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
