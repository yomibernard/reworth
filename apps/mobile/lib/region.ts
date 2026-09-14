/**
 * Region config — config-driven cities (ADR-008).
 */

import { apiFetch } from "./api";

export type RegionCity = {
  city: string;
  displayName: string;
};

export async function listRegions(): Promise<RegionCity[]> {
  const res = await apiFetch<{ items: RegionCity[] }>("/regions");
  return res.items ?? [];
}
