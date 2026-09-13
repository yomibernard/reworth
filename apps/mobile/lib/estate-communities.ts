import { apiFetch } from "./api";
import type { PublicListing } from "./types";

export type EstateCommunity = {
  id: string;
  slug: string;
  name: string;
  type: string;
  privacy: string;
  about: string;
  verified: boolean;
};

export type EstateCommunityDetail = EstateCommunity & {
  membershipStatus: string | null;
  isMember: boolean;
};

export async function listEstateCommunities(
  token?: string | null,
): Promise<{ items: EstateCommunity[] }> {
  return apiFetch("/communities?limit=50", { token });
}

export async function getEstateCommunity(
  slugOrId: string,
  token?: string | null,
): Promise<EstateCommunityDetail> {
  return apiFetch(`/communities/${encodeURIComponent(slugOrId)}`, { token });
}

export async function requestJoinCommunity(
  token: string,
  communityId: string,
) {
  return apiFetch(`/communities/${communityId}/join-request`, {
    method: "POST",
    token,
  });
}

export async function redeemCommunityInvite(token: string, code: string) {
  return apiFetch("/communities/redeem-invite", {
    method: "POST",
    token,
    body: { code },
  });
}

export async function listMyCommunities(token: string) {
  return apiFetch<{
    items: Array<{
      membershipId: string;
      status: string;
      community: EstateCommunity;
    }>;
  }>("/me/communities", { token });
}

export async function listCommunityListings(
  communityId: string,
  token?: string | null,
): Promise<{ items: PublicListing[] }> {
  return apiFetch(`/communities/${communityId}/listings`, { token });
}
