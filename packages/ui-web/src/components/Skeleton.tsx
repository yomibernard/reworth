"use client";

import type { HTMLAttributes } from "react";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  /** Accessible label announced while loading. */
  label?: string;
}

export function Skeleton({
  className = "",
  label = "Loading",
  ...rest
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={[
        "animate-pulse rounded-[var(--rw-radius)] bg-[var(--rw-border)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}
