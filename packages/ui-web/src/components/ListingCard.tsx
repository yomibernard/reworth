"use client";

import type { HTMLAttributes, ReactNode } from "react";

export interface ListingCardProps extends HTMLAttributes<HTMLElement> {
  title: string;
  priceLabel: string;
  community?: string;
  imageSrc?: string;
  imageAlt?: string;
  verified?: boolean;
  footer?: ReactNode;
  className?: string;
}

export function ListingCard({
  title,
  priceLabel,
  community,
  imageSrc,
  imageAlt,
  verified = false,
  footer,
  className = "",
  ...rest
}: ListingCardProps) {
  return (
    <article
      className={[
        "flex flex-col overflow-hidden rounded-[var(--rw-radius-lg)]",
        "bg-[var(--rw-bg-elevated)] border border-[var(--rw-border)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <div className="relative aspect-[3/4] bg-[var(--rw-accent-muted)]">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={imageAlt ?? title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-[var(--rw-ink-muted)] text-sm"
            aria-hidden
          >
            No photo
          </div>
        )}
        {verified ? (
          <span
            className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{
              background: "var(--rw-gold-muted)",
              color: "var(--rw-gold)",
            }}
            aria-label="Verified seller"
          >
            Verified ✓
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-[1.25rem] font-bold text-[var(--rw-ink)] leading-tight">
          {priceLabel}
        </p>
        <h3 className="text-[0.9375rem] font-medium text-[var(--rw-ink)] line-clamp-1">
          {title}
        </h3>
        {community ? (
          <p className="text-[0.8125rem] text-[var(--rw-ink-muted)]">{community}</p>
        ) : null}
        {footer ? <div className="mt-auto pt-2">{footer}</div> : null}
      </div>
    </article>
  );
}
