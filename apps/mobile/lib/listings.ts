import { apiFetch } from "./api";
import type { PriceIntelligence, PublicListing } from "./types";

export async function createListing(
  token: string,
  body: Record<string, unknown> = {},
): Promise<PublicListing> {
  return apiFetch<PublicListing>("/listings", {
    method: "POST",
    token,
    body,
  });
}

export async function getListing(
  id: string,
  token?: string | null,
): Promise<PublicListing> {
  return apiFetch<PublicListing>(`/listings/${id}`, { token });
}

export async function browseListings(
  token?: string | null,
): Promise<PublicListing[]> {
  return apiFetch<PublicListing[]>("/listings?limit=30", { token });
}

export async function patchListing(
  id: string,
  token: string,
  body: Record<string, unknown>,
): Promise<PublicListing> {
  return apiFetch<PublicListing>(`/listings/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export async function publishListing(
  id: string,
  token: string,
): Promise<PublicListing> {
  return apiFetch<PublicListing>(`/listings/${id}/publish`, {
    method: "POST",
    token,
  });
}

export async function appealListing(
  id: string,
  token: string,
  reason: string,
): Promise<{ id: string; status: string }> {
  return apiFetch(`/listings/${id}/appeal`, {
    method: "POST",
    token,
    body: { reason },
  });
}

export async function assistListing(
  id: string,
  token: string,
  imageKeys?: string[],
): Promise<{
  draft: {
    title: string;
    description: string;
    brand?: string;
    suggestedCondition: string;
    suggestedCategory: string;
    suggestedPriceNaira: number;
  };
}> {
  return apiFetch(`/listings/${id}/assist`, {
    method: "POST",
    token,
    body: imageKeys ? { imageKeys } : {},
  });
}

export async function getPriceIntelligence(
  id: string,
): Promise<PriceIntelligence> {
  return apiFetch(`/listings/${id}/price-intelligence`);
}

export async function attachListingImages(
  id: string,
  token: string,
  images: { key: string; sortOrder: number }[],
): Promise<{ listing: PublicListing }> {
  return apiFetch(`/listings/${id}/images`, {
    method: "POST",
    token,
    body: { images },
  });
}

export async function presignMedia(
  token: string,
  listingId: string,
  fileName: string,
  contentType: string,
  contentLength: number,
): Promise<{ uploadUrl: string; key: string }> {
  return apiFetch("/media/presign", {
    method: "POST",
    token,
    body: { listingId, fileName, contentType, contentLength },
  });
}

export async function completeMedia(
  token: string,
  listingId: string,
  key: string,
  sortOrder: number,
): Promise<unknown> {
  return apiFetch("/media/complete", {
    method: "POST",
    token,
    body: { listingId, key, sortOrder },
  });
}
