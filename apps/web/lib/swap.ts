import { apiFetch } from "./api";
import type { PublicListing } from "./types";

export type SwapProposal = {
  id: string;
  listingId: string;
  proposerId: string;
  offeredListingId: string;
  cashComponentKobo: number;
  note?: string | null;
  status: string;
  expiresAt: string;
  offeredListing?: PublicListing;
  listing?: PublicListing;
  orderId?: string;
};

export type GiveawayClaim = {
  id: string;
  listingId: string;
  claimantId: string;
  status: string;
  note?: string | null;
  expiresAt: string;
  claimant?: { id: string; profile?: { displayName?: string } };
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

export async function listSwapProposals(
  token: string,
  listingId: string,
): Promise<{ items: SwapProposal[] }> {
  return apiFetch(`/listings/${listingId}/swap-proposals`, { token });
}

export async function acceptSwapProposal(token: string, id: string) {
  return apiFetch(`/swap-proposals/${id}/accept`, { method: "POST", token });
}

export async function rejectSwapProposal(token: string, id: string) {
  return apiFetch(`/swap-proposals/${id}/reject`, { method: "POST", token });
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

export async function listGiveawayClaims(
  token: string,
  listingId: string,
): Promise<{ items: GiveawayClaim[] }> {
  return apiFetch(`/listings/${listingId}/giveaway-claims`, { token });
}

export async function approveGiveawayClaim(token: string, id: string) {
  return apiFetch(`/giveaway-claims/${id}/approve`, { method: "POST", token });
}

export async function rejectGiveawayClaim(token: string, id: string) {
  return apiFetch(`/giveaway-claims/${id}/reject`, { method: "POST", token });
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
