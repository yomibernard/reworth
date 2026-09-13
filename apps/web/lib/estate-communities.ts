import { apiFetch } from "./api";
import type { PublicListing } from "./types";

export type EstateCommunity = {
  id: string;
  slug: string;
  name: string;
  type: string;
  privacy: string;
  coverUrl: string | null;
  about: string;
  verified: boolean;
  active: boolean;
  geoLat: number | null;
  geoLng: number | null;
  membershipCount?: number;
};

export type EstateCommunityDetail = EstateCommunity & {
  membershipStatus: string | null;
  isMember: boolean;
};

export type MyCommunityMembership = {
  membershipId: string;
  status: string;
  joinedAt: string | null;
  community: EstateCommunity;
};

export type CommunityInvite = {
  id: string;
  code: string;
  maxUses: number;
  useCount: number;
  expiresAt: string;
  communityId: string;
};

export type CommunityMembership = {
  id: string;
  communityId: string;
  userId: string;
  status: string;
  joinedAt: string | null;
  createdAt: string;
};

export async function listEstateCommunities(
  query: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    type?: string;
    privacy?: string;
    limit?: number;
  } = {},
  token?: string | null,
): Promise<{ items: EstateCommunity[] }> {
  const params = new URLSearchParams();
  if (query.lat != null) params.set("lat", String(query.lat));
  if (query.lng != null) params.set("lng", String(query.lng));
  if (query.radiusKm != null) params.set("radiusKm", String(query.radiusKm));
  if (query.type) params.set("type", query.type);
  if (query.privacy) params.set("privacy", query.privacy);
  if (query.limit != null) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch(`/communities${qs ? `?${qs}` : ""}`, { token });
}

export async function getEstateCommunity(
  slugOrId: string,
  token?: string | null,
): Promise<EstateCommunityDetail> {
  return apiFetch(`/communities/${encodeURIComponent(slugOrId)}`, { token });
}

export async function listMyCommunities(
  token: string,
): Promise<{ items: MyCommunityMembership[] }> {
  return apiFetch("/me/communities", { token });
}

export async function requestJoinCommunity(
  token: string,
  communityId: string,
): Promise<CommunityMembership> {
  return apiFetch(`/communities/${communityId}/join-request`, {
    method: "POST",
    token,
  });
}

export async function redeemCommunityInvite(
  token: string,
  code: string,
): Promise<CommunityMembership> {
  return apiFetch("/communities/redeem-invite", {
    method: "POST",
    token,
    body: { code },
  });
}

export async function leaveCommunity(
  token: string,
  membershipId: string,
): Promise<CommunityMembership> {
  return apiFetch(`/memberships/${membershipId}/leave`, {
    method: "POST",
    token,
  });
}

export async function createCommunityInvite(
  token: string,
  communityId: string,
  body: { maxUses?: number; expiryDays?: number } = {},
): Promise<CommunityInvite> {
  return apiFetch(`/communities/${communityId}/invites`, {
    method: "POST",
    token,
    body,
  });
}

export async function listCommunityListings(
  communityId: string,
  token?: string | null,
): Promise<{ items: PublicListing[] }> {
  return apiFetch(`/communities/${communityId}/listings`, { token });
}
