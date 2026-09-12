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
      <div className="relative aspect-[4/3] bg-[var(--rw-accent-muted)]">
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
            className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              background: "var(--rw-gold-muted)",
              color: "var(--rw-gold)",
            }}
            aria-label="Verified seller"
          >
            Verified
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-base font-medium text-[var(--rw-ink)] line-clamp-2">
          {title}
        </h3>
        <p className="text-lg font-semibold text-[var(--rw-accent)]">
          {priceLabel}
        </p>
        {community ? (
          <p className="text-sm text-[var(--rw-ink-muted)]">{community}</p>
        ) : null}
        {footer ? <div className="mt-auto pt-2">{footer}</div> : null}
      </div>
    </article>
  );
}
