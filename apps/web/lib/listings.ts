import { apiFetch } from "./api";
import type {
  AssistResponse,
  CreateListingBody,
  PresignMediaResponse,
  PriceIntelligence,
  PublicListing,
  UpdateListingBody,
} from "./types";

/** Best URL from image variants for display. */
export function listingImageUrl(
  image: PublicListing["images"][number] | undefined,
): string | null {
  if (!image?.variants) return null;
  const v = image.variants;
  return (
    v.w1080?.webp ??
    v.w640?.webp ??
    v.w1600?.webp ??
    (typeof v.original === "string" ? v.original : null) ??
    null
  );
}

export async function createListing(
  token: string,
  body: CreateListingBody = {},
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

export async function patchListing(
  id: string,
  token: string,
  body: UpdateListingBody,
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
): Promise<AssistResponse> {
  return apiFetch<AssistResponse>(`/listings/${id}/assist`, {
    method: "POST",
    token,
    body: imageKeys ? { imageKeys } : {},
  });
}

export async function getPriceIntelligence(
  id: string,
): Promise<PriceIntelligence> {
  return apiFetch<PriceIntelligence>(`/listings/${id}/price-intelligence`);
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

export async function reportListing(
  id: string,
  token: string,
  reason: string,
  detail?: string,
): Promise<unknown> {
  return apiFetch(`/listings/${id}/report`, {
    method: "POST",
    token,
    body: { reason, detail },
  });
}

/**
 * Presign → optional PUT → collect key.
 * Mock storage may reject PUT; then complete via attachListingImages is enough.
 */
export async function uploadListingPhoto(
  token: string,
  listingId: string,
  file: File,
): Promise<{ key: string; previewUrl: string }> {
  const presign = await apiFetch<PresignMediaResponse>("/media/presign", {
    method: "POST",
    token,
    body: {
      listingId,
      contentType: file.type || "image/jpeg",
      contentLength: file.size || 1024,
      fileName: file.name || "photo.jpg",
    },
  });

  try {
    const put = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: file,
    });
    if (!put.ok) {
      // Mock / unsigned URLs often fail — proceed with key for complete/attach
    }
  } catch {
    // Network or CORS — skip PUT for mock path
  }

  return {
    key: presign.key,
    previewUrl: URL.createObjectURL(file),
  };
}

/** Relative time for PDP “time posted”. */
export function formatPostedAt(iso: string | null | undefined): string {
  if (!iso) return "Just listed";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Just listed";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

export const CONDITION_LABELS: Record<string, string> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  VERY_GOOD: "Very good",
  GOOD: "Good",
  FAIR: "Fair",
  FOR_PARTS: "For parts",
};

export const CONDITIONS = [
  "NEW",
  "LIKE_NEW",
  "VERY_GOOD",
  "GOOD",
  "FAIR",
  "FOR_PARTS",
] as const;
