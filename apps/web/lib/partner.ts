/**
 * Phase 3.2 — Estate partner console (JWT or API-key session).
 *
 * Auth: prefer user Bearer token (CommunityManager). Optional
 * `x-reworth-partner-key` for machine sessions — store only in sessionStorage.
 */

import { API_URL, ApiError } from "./api";

const PARTNER_KEY_STORAGE = "reworth_partner_api_key";

export type PartnerKpis = {
  members?: number;
  pending?: number;
  liveListings?: number;
  joins7d?: number;
  leaves7d?: number;
  communityId?: string;
  communityName?: string;
  companyName?: string;
  [key: string]: unknown;
};

export type PartnerMembership = {
  id: string;
  userId?: string;
  status: string;
  displayName?: string | null;
  phoneMasked?: string | null;
  createdAt?: string;
  joinedAt?: string | null;
};

export type PartnerMe = {
  partnerId?: string;
  companyName?: string;
  communityId?: string;
  communityName?: string;
  status?: string;
  kpis?: PartnerKpis;
};

export function getStoredPartnerKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(PARTNER_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function setStoredPartnerKey(key: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!key) sessionStorage.removeItem(PARTNER_KEY_STORAGE);
    else sessionStorage.setItem(PARTNER_KEY_STORAGE, key);
  } catch {
    /* ignore */
  }
}

function messageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const msg = (body as { message?: unknown }).message;
  if (typeof msg === "string") return msg;
  if (Array.isArray(msg) && msg.every((m) => typeof m === "string")) {
    return msg.join(", ");
  }
  return fallback;
}

export type PartnerFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
  partnerKey?: string | null;
};

/** Partner-scoped fetch: Bearer and/or x-reworth-partner-key. */
export async function partnerFetch<T>(
  path: string,
  options: PartnerFetchOptions = {},
): Promise<T> {
  const { body, token, partnerKey, headers, ...rest } = options;
  const key = partnerKey ?? getStoredPartnerKey();
  const res = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(key ? { "x-reworth-partner-key": key } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      messageFromBody(parsed, res.statusText || "Request failed"),
      res.status,
      parsed,
    );
  }

  return parsed as T;
}

export async function getPartnerMe(
  token?: string | null,
  partnerKey?: string | null,
): Promise<PartnerMe> {
  return partnerFetch<PartnerMe>("/partner/me", { token, partnerKey });
}

export async function getPartnerKpis(
  token?: string | null,
  partnerKey?: string | null,
): Promise<PartnerKpis> {
  try {
    return await partnerFetch<PartnerKpis>("/partner/me/kpis", {
      token,
      partnerKey,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      const me = await getPartnerMe(token, partnerKey);
      return me.kpis ?? {};
    }
    throw err;
  }
}

export async function listPartnerMembershipQueue(
  token?: string | null,
  partnerKey?: string | null,
  status = "INVITED",
): Promise<PartnerMembership[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await partnerFetch<
    PartnerMembership[] | { items?: PartnerMembership[] }
  >(`/partner/memberships${qs}`, { token, partnerKey });
  if (Array.isArray(res)) return res;
  return res.items ?? [];
}

export async function decidePartnerMembership(
  membershipId: string,
  action: "approve" | "reject" | "suspend",
  token?: string | null,
  partnerKey?: string | null,
): Promise<unknown> {
  return partnerFetch(`/partner/memberships/${encodeURIComponent(membershipId)}/${action}`, {
    method: "POST",
    token,
    partnerKey,
    body: {},
  });
}
