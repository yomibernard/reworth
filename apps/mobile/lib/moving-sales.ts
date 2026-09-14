import { apiFetch } from "./api";
import type { PublicListing } from "./types";

export type MovingSaleSummary = {
  id: string;
  title: string;
  deadline: string;
  community: string;
  itemCount: number;
  combinedAskingPriceKobo: number;
  followed?: boolean;
};

export type MovingSaleDetail = MovingSaleSummary & {
  blurb?: string;
  status: string;
  seller: { id: string; displayName: string };
  items: PublicListing[];
};

export async function getMovingSale(
  id: string,
  token?: string | null,
): Promise<MovingSaleDetail> {
  return apiFetch(`/moving-sales/${id}`, { token });
}

export async function browseMovingSales(
  token?: string | null,
): Promise<{ items: MovingSaleSummary[] }> {
  return apiFetch("/moving-sales?limit=20", { token });
}

export async function followMovingSale(token: string, id: string) {
  return apiFetch(`/moving-sales/${id}/follow`, { method: "POST", token });
}

export async function unfollowMovingSale(token: string, id: string) {
  return apiFetch(`/moving-sales/${id}/follow`, { method: "DELETE", token });
}

export async function recordMovingSaleEvent(
  id: string,
  type: string,
  payload?: Record<string, unknown>,
  token?: string | null,
) {
  return apiFetch(`/moving-sales/${id}/events`, {
    method: "POST",
    token,
    body: payload ? { type, payload } : { type },
  });
}
