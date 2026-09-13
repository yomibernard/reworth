import { API_URL, apiFetch } from "./api";
import type {
  RecommendationSurface,
  RecommendationsResponse,
  SellerAnalytics,
} from "./types";

export type FetchRecommendationsParams = {
  surface: RecommendationSurface;
  listingId?: string;
  city?: string;
  limit?: number;
};

function appendParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined | null,
) {
  if (value === undefined || value === null || value === "") return;
  params.set(key, String(value));
}

export function buildRecommendationsQuery(
  params: FetchRecommendationsParams,
): string {
  const qs = new URLSearchParams();
  appendParam(qs, "surface", params.surface);
  appendParam(qs, "listingId", params.listingId);
  appendParam(qs, "city", params.city);
  appendParam(qs, "limit", params.limit);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * Normalise API payloads that may return either `{ items: [...] }` or a bare array.
 */
function normalizeRecommendations(
  raw: RecommendationsResponse | unknown,
  surface: RecommendationSurface,
): RecommendationsResponse {
  if (Array.isArray(raw)) {
    return { items: raw, surface };
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as RecommendationsResponse).items)) {
    return raw as RecommendationsResponse;
  }
  return { items: [], surface };
}

export async function fetchRecommendations(
  params: FetchRecommendationsParams,
  token?: string | null,
): Promise<RecommendationsResponse> {
  const qs = buildRecommendationsQuery(params);
  const raw = await apiFetch<RecommendationsResponse | unknown>(
    `/recommendations${qs}`,
    { token },
  );
  return normalizeRecommendations(raw, params.surface);
}

export async function fetchSellerAnalytics(
  token: string,
  params?: { city?: string },
): Promise<SellerAnalytics> {
  const qs = new URLSearchParams();
  appendParam(qs, "city", params?.city);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<SellerAnalytics>(`/me/seller-analytics${suffix}`, { token });
}

/** Absolute URL for CSV download (caller attaches Authorization header or opens with token). */
export function sellerAnalyticsExportUrl(params?: { city?: string }): string {
  const qs = new URLSearchParams();
  appendParam(qs, "city", params?.city);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return `${API_URL}/me/seller-analytics/export.csv${suffix}`;
}

/** Download CSV with bearer token (browser). */
export async function downloadSellerAnalyticsCsv(
  token: string,
  params?: { city?: string },
): Promise<void> {
  const url = sellerAnalyticsExportUrl(params);
  const res = await fetch(url, {
    headers: {
      Accept: "text/csv",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = "reworth-seller-analytics.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
