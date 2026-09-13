/**
 * Phase 3.2 — Config-driven cities (GET /regions).
 */

import { apiFetch } from "./api";

export type RegionCity = {
  key: string;
  displayName: string;
  timezone?: string;
  communities?: string[];
  enabled?: boolean;
  smsEnabled?: boolean;
  pspEnabled?: boolean;
};

export type RegionDetail = RegionCity & {
  logistics?: {
    baseFeeKobo?: number;
    perKmKobo?: number;
  };
  priceBands?: unknown;
  geocoding?: Record<string, { lat: number; lng: number }>;
};

function asCities(
  res: RegionCity[] | { items?: RegionCity[]; cities?: RegionCity[] } | null,
): RegionCity[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.cities)) return res.cities;
  return [];
}

/** List enabled cities. Returns [] if endpoint missing (404). */
export async function listRegions(): Promise<RegionCity[]> {
  try {
    const res = await apiFetch<
      RegionCity[] | { items?: RegionCity[]; cities?: RegionCity[] }
    >("/regions");
    return asCities(res);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return [];
    throw err;
  }
}

export async function getRegion(key: string): Promise<RegionDetail | null> {
  try {
    return await apiFetch<RegionDetail>(
      `/regions/${encodeURIComponent(key)}`,
    );
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return null;
    throw err;
  }
}

export function regionLabel(city: RegionCity): string {
  return city.displayName || city.key;
}
