"use client";

import Link from "next/link";
import { ListingCard } from "@reworth/ui-web";
import { listingPriceLabel } from "../../lib/discovery";
import { listingImageUrl } from "../../lib/listings";
import type { PublicListing } from "../../lib/types";

type Props = {
  listing: PublicListing;
  favourited?: boolean;
  onToggleFavourite?: (listing: PublicListing) => void;
  className?: string;
};

export function DiscoveryListingCard({
  listing,
  favourited,
  onToggleFavourite,
  className = "",
}: Props) {
  const images = [...listing.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const src = listingImageUrl(images[0]) ?? "/brand/illustrations/listing-placeholder.png";

  return (
    <div className={`relative ${className}`}>
      <Link
        href={`/listings/${listing.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)] rounded-[var(--rw-radius-lg)]"
      >
        <ListingCard
          title={listing.title || "Untitled"}
          priceLabel={listingPriceLabel(listing)}
          community={listing.community || undefined}
          imageSrc={src}
          imageAlt=""
          verified={listing.seller.verificationBadge}
        />
      </Link>
      {onToggleFavourite ? (
        <button
          type="button"
          aria-label={favourited ? "Remove from saved" : "Save listing"}
          aria-pressed={Boolean(favourited)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavourite(listing);
          }}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--rw-bg-elevated)]/95 text-lg shadow-sm border border-[var(--rw-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)]"
        >
          <span aria-hidden style={{ color: favourited ? "#DC2626" : "#5C636A" }}>
            {favourited ? "♥" : "♡"}
          </span>
        </button>
      ) : null}
    </div>
  );
}
