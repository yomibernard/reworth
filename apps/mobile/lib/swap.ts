import { apiFetch } from "./api";
import type { PublicListing } from "./types";

export type SwapProposal = {
  id: string;
  listingId: string;
  offeredListingId: string;
  cashComponentKobo: number;
  note?: string | null;
  status: string;
};

export type GiveawayClaim = {
  id: string;
  listingId: string;
  claimantId: string;
  status: string;
};

export async function createSwapProposal(
  token: string,
  listingId: string,
  body: { offeredListingId: string; cashComponentKobo?: number; note?: string },
): Promise<SwapProposal> {
  return apiFetch(`/listings/${listingId}/swap-proposals`, {
    method: "POST",
    token,
    body,
  });
}

export async function createGiveawayClaim(
  token: string,
  listingId: string,
  note?: string,
): Promise<GiveawayClaim> {
  return apiFetch(`/listings/${listingId}/giveaway-claims`, {
    method: "POST",
    token,
    body: note ? { note } : {},
  });
}

export async function myLiveListings(
  token: string,
): Promise<{ items: PublicListing[] }> {
  const raw = await apiFetch<PublicListing[] | { items: PublicListing[] }>(
    "/listings?mine=1&status=LIVE&limit=50",
    { token },
  );
  const items = Array.isArray(raw) ? raw : (raw.items ?? []);
  return { items };
}
