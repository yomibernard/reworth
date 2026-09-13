import { API_URL, apiFetch } from "./api";
import type { PublicListing } from "./types";

export type RecommendationSurface = "home" | "similar" | "post_checkout";

export type RecommendationsResponse = {
  items: PublicListing[];
  surface?: RecommendationSurface | string;
  experimentKey?: string;
  variant?: string;
  city?: string;
};

export type SellerListingMetrics = {
  listingId: string;
  title: string;
  status: string;
  views: number;
  saves: number;
  offers: number;
  offerToSaleConversion: number;
  timeToSaleHours: number | null;
  priceCompetitiveness: number | null;
  askingKobo: number;
  marketMidKobo?: number | null;
  revenueKobo?: number;
  city?: string;
};

export type SellerAnalytics = {
  city?: string;
  aggregate: {
    views: number;
    saves: number;
    offers: number;
    offerToSaleConversion: number;
    medianTimeToSaleHours: number | null;
    responseMinutes?: number | null;
    revenue30dKobo: number;
    revenue90dKobo: number;
  };
  listings: SellerListingMetrics[];
  bestPerformers: SellerListingMetrics[];
  worstPerformers: SellerListingMetrics[];
};

export type FetchRecommendationsParams = {
  surface: RecommendationSurface;
  listingId?: string;
  city?: string;
  limit?: number;
};

function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

function normalizeRecommendations(
  raw: RecommendationsResponse | PublicListing[] | unknown,
  surface: RecommendationSurface,
): RecommendationsResponse {
  if (Array.isArray(raw)) {
    return { items: raw, surface };
  }
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as RecommendationsResponse).items)
  ) {
    return raw as RecommendationsResponse;
  }
  return { items: [], surface };
}

export async function fetchRecommendations(
  params: FetchRecommendationsParams,
  token?: string | null,
): Promise<RecommendationsResponse> {
  const raw = await apiFetch<RecommendationsResponse | PublicListing[]>(
    `/recommendations${qs({
      surface: params.surface,
      listingId: params.listingId,
      city: params.city,
      limit: params.limit,
    })}`,
    { token },
  );
  return normalizeRecommendations(raw, params.surface);
}

export async function fetchSellerAnalytics(
  token: string,
  params?: { city?: string },
): Promise<SellerAnalytics> {
  return apiFetch<SellerAnalytics>(
    `/me/seller-analytics${qs({ city: params?.city })}`,
    { token },
  );
}

export function sellerAnalyticsExportUrl(params?: { city?: string }): string {
  return `${API_URL}/me/seller-analytics/export.csv${qs({ city: params?.city })}`;
}
