import { apiFetch } from "./api";
import type { PublicListing } from "./types";

export type MovingSaleSummary = {
  id: string;
  title: string;
  blurb?: string;
  deadline: string;
  community: string;
  communityId?: string | null;
  status: string;
  itemCount: number;
  combinedAskingPriceKobo: number;
  distanceKm?: number | null;
  followed?: boolean;
  coverListingId?: string | null;
};

export type MovingSaleDetail = MovingSaleSummary & {
  estate?: {
    id: string;
    slug: string;
    name: string;
    privacy: string;
  } | null;
  geoLat?: number | null;
  geoLng?: number | null;
  seller: { id: string; displayName: string };
  items: PublicListing[];
  createdAt: string;
  updatedAt: string;
};

export type CreateMovingSaleBody = {
  title: string;
  blurb?: string;
  deadline: string;
  community?: string;
  communityId?: string;
  geoLat?: number;
  geoLng?: number;
  listingIds?: string[];
};

export async function createMovingSale(
  token: string,
  body: CreateMovingSaleBody,
): Promise<MovingSaleDetail> {
  return apiFetch("/moving-sales", { method: "POST", token, body });
}

export async function getMovingSale(
  id: string,
  token?: string | null,
): Promise<MovingSaleDetail> {
  return apiFetch(`/moving-sales/${id}`, { token });
}

export async function browseMovingSales(
  query: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    limit?: number;
  } = {},
  token?: string | null,
): Promise<{ items: MovingSaleSummary[] }> {
  const params = new URLSearchParams();
  if (query.lat != null) params.set("lat", String(query.lat));
  if (query.lng != null) params.set("lng", String(query.lng));
  if (query.radiusKm != null) params.set("radiusKm", String(query.radiusKm));
  if (query.limit != null) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch(`/moving-sales${qs ? `?${qs}` : ""}`, { token });
}

export async function followMovingSale(token: string, id: string) {
  return apiFetch<{ ok: boolean; followed: boolean }>(
    `/moving-sales/${id}/follow`,
    { method: "POST", token },
  );
}

export async function unfollowMovingSale(token: string, id: string) {
  return apiFetch<{ ok: boolean; followed: boolean }>(
    `/moving-sales/${id}/follow`,
    { method: "DELETE", token },
  );
}

export async function attachMovingSaleListings(
  token: string,
  id: string,
  listingIds: string[],
): Promise<MovingSaleDetail> {
  return apiFetch(`/moving-sales/${id}/listings`, {
    method: "POST",
    token,
    body: { listingIds },
  });
}

export async function recordMovingSaleEvent(
  id: string,
  type: string,
  payload?: Record<string, unknown>,
  token?: string | null,
) {
  return apiFetch<{ id: string; type: string }>(`/moving-sales/${id}/events`, {
    method: "POST",
    token,
    body: payload ? { type, payload } : { type },
  });
}
