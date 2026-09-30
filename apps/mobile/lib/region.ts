/**
 * Config-driven cities (GET /regions). Consumer list = pilot (Lagos + Abuja).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "./api";

const PREFERRED_CITY_KEY = "reworth_preferred_city";

export type RegionCity = {
  city: string;
  key: string;
  displayName: string;
  status?: "pilot" | "supply" | "disabled" | string;
  timezone?: string;
  communities?: string[];
};

export type RegionDetail = RegionCity & {
  logistics?: {
    baseFeeKobo?: number;
    perKmKobo?: number;
  };
  smsEnabled?: boolean;
  pspEnabled?: boolean;
};

function normalize(raw: unknown): RegionCity | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const city =
    typeof o.city === "string"
      ? o.city
      : typeof o.key === "string"
        ? o.key
        : "";
  if (!city) return null;
  return {
    city,
    key: typeof o.key === "string" ? o.key : city,
    displayName:
      typeof o.displayName === "string" ? o.displayName : city,
    status: typeof o.status === "string" ? o.status : undefined,
    communities: Array.isArray(o.communities)
      ? (o.communities as string[])
      : undefined,
  };
}

function asCities(res: unknown): RegionCity[] {
  if (!res) return [];
  if (Array.isArray(res)) {
    return res.map(normalize).filter(Boolean) as RegionCity[];
  }
  if (typeof res === "object") {
    const o = res as { items?: unknown[]; cities?: unknown[] };
    const list = o.items ?? o.cities ?? [];
    return list.map(normalize).filter(Boolean) as RegionCity[];
  }
  return [];
}

/** Pilot cities for pickers (Lagos + Abuja). */
export async function listRegions(): Promise<RegionCity[]> {
  try {
    const res = await apiFetch<unknown>("/regions");
    return asCities(res);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return [];
    throw err;
  }
}

export async function getRegion(key: string): Promise<RegionDetail | null> {
  try {
    const raw = await apiFetch<unknown>(
      `/regions/${encodeURIComponent(key)}`,
    );
    return normalize(raw) as RegionDetail | null;
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function getPreferredCityKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PREFERRED_CITY_KEY);
  } catch {
    return null;
  }
}

export async function setPreferredCityKey(cityKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFERRED_CITY_KEY, cityKey);
  } catch {
    /* ignore */
  }
}

/** Human labels for sell/profile chips from region community codes. */
export function communityLabelsForCity(cityKey: string): string[] {
  const key = cityKey.toLowerCase();
  if (key === "abuja") {
    return [
      "Maitama",
      "Asokoro",
      "Wuse",
      "Garki",
      "Jabi",
      "Guzape",
      "Other Abuja",
    ];
  }
  return [
    "Lekki Ph1",
    "Ikoyi",
    "VI",
    "Oniru",
    "VGC",
    "Chevron",
    "Ajah",
    "Other Lagos",
  ];
}

export function regionLabel(city: RegionCity): string {
  return city.displayName || city.key || city.city;
}
