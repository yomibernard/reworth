import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "./api";
import type { PublicListing } from "./types";

export type RadiusKm = 2 | 5 | 10 | 25;

export type SearchFilters = {
  q?: string;
  categoryId?: string;
  condition?: string;
  community?: string;
  radiusKm?: RadiusKm;
  priceMinKobo?: number;
  priceMaxKobo?: number;
  verifiedOnly?: boolean;
  deliveryAvailable?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "distance";
  cursor?: string;
  limit?: number;
};

export type HomeRail = {
  id: string;
  title: string;
  items: PublicListing[];
  emptyMessage?: string;
};

export type HomeResponse = {
  rails: HomeRail[];
  community?: string;
  radiusKm?: number;
};

export type SearchResult = {
  items: PublicListing[];
  nextCursor?: string;
  tookMs: number;
  total: number;
};

export type FavouriteItem = {
  favouriteId: string;
  savedAt: string;
  listing: PublicListing;
};

export type MeFavouritesResponse = {
  items: FavouriteItem[];
  sellers: Array<{
    followId: string;
    seller: { id: string; displayName: string; verificationBadge: boolean };
  }>;
  searches: Array<{
    id: string;
    name: string;
    filters: Record<string, unknown>;
    newMatchesCount: number;
  }>;
};

const HOME_CACHE_KEY = "rw_home_cache_v1";

function qs(filters: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function fetchHome(
  params: {
    community?: string;
    radiusKm?: RadiusKm;
  },
  token?: string | null,
): Promise<HomeResponse> {
  return apiFetch<HomeResponse>(
    `/home${qs({
      community: params.community,
      radiusKm: params.radiusKm,
    })}`,
    { token },
  );
}

export async function cacheHome(data: HomeResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(HOME_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export async function loadCachedHome(): Promise<HomeResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HomeResponse;
  } catch {
    return null;
  }
}

export async function searchListings(
  filters: SearchFilters,
  token?: string | null,
): Promise<SearchResult> {
  return apiFetch<SearchResult>(
    `/search${qs({
      q: filters.q,
      categoryId: filters.categoryId,
      condition: filters.condition,
      community: filters.community,
      radiusKm: filters.radiusKm,
      priceMinKobo: filters.priceMinKobo,
      priceMaxKobo: filters.priceMaxKobo,
      verifiedOnly: filters.verifiedOnly,
      deliveryAvailable: filters.deliveryAvailable,
      sort: filters.sort,
      cursor: filters.cursor,
      limit: filters.limit ?? 24,
    })}`,
    { token },
  );
}

export async function favouriteListing(
  id: string,
  token: string,
): Promise<{ ok: boolean }> {
  return apiFetch(`/listings/${id}/favourite`, { method: "POST", token });
}

export async function unfavouriteListing(
  id: string,
  token: string,
): Promise<{ ok: boolean }> {
  return apiFetch(`/listings/${id}/favourite`, { method: "DELETE", token });
}

export async function getMeFavourites(
  token: string,
): Promise<MeFavouritesResponse> {
  return apiFetch<MeFavouritesResponse>("/me/favourites", { token });
}
