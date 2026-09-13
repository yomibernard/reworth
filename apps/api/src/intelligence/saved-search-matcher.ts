import { haversineKm } from '../providers/search.provider';
import { citiesMatch, DEFAULT_CITY, normalizeCity } from './city-scope';

export type SavedSearchListingShape = {
  id?: string;
  title: string;
  description: string;
  categoryId: string | null;
  subcategoryId: string | null;
  priceKobo: number;
  condition: string;
  community: string;
  city?: string | null;
  fulfilmentDelivery: boolean;
  geoLat?: number | null;
  geoLng?: number | null;
  brand?: string | null;
};

/**
 * Shared saved-search filter matcher (favourites bump + alert scheduler).
 * City defaults to Lagos when omitted on either side.
 */
export function matchesSavedFilters(
  listing: SavedSearchListingShape,
  filters: Record<string, unknown>,
): boolean {
  const filterCity =
    typeof filters.city === 'string' && filters.city.trim()
      ? filters.city
      : DEFAULT_CITY;
  if (!citiesMatch(listing.city ?? DEFAULT_CITY, filterCity)) {
    return false;
  }

  if (
    typeof filters.categoryId === 'string' &&
    filters.categoryId &&
    listing.categoryId !== filters.categoryId
  ) {
    return false;
  }
  if (
    typeof filters.subcategoryId === 'string' &&
    filters.subcategoryId &&
    listing.subcategoryId !== filters.subcategoryId
  ) {
    return false;
  }
  if (
    typeof filters.community === 'string' &&
    filters.community &&
    listing.community !== filters.community
  ) {
    return false;
  }
  if (
    typeof filters.condition === 'string' &&
    filters.condition &&
    listing.condition !== filters.condition
  ) {
    return false;
  }
  if (
    typeof filters.brand === 'string' &&
    filters.brand &&
    (listing.brand ?? '').toLowerCase() !== filters.brand.toLowerCase()
  ) {
    return false;
  }
  if (
    typeof filters.priceMaxKobo === 'number' &&
    listing.priceKobo > filters.priceMaxKobo
  ) {
    return false;
  }
  if (
    typeof filters.priceMinKobo === 'number' &&
    listing.priceKobo < filters.priceMinKobo
  ) {
    return false;
  }
  if (filters.deliveryAvailable === true && !listing.fulfilmentDelivery) {
    return false;
  }
  if (typeof filters.q === 'string' && filters.q.trim()) {
    const hay = `${listing.title} ${listing.description}`.toLowerCase();
    const q = filters.q.trim().toLowerCase();
    if (!hay.includes(q)) return false;
  }

  // Optional geo radius
  const lat =
    typeof filters.lat === 'number'
      ? filters.lat
      : typeof filters.geoLat === 'number'
        ? filters.geoLat
        : null;
  const lng =
    typeof filters.lng === 'number'
      ? filters.lng
      : typeof filters.geoLng === 'number'
        ? filters.geoLng
        : null;
  const radiusKm =
    typeof filters.radiusKm === 'number' ? filters.radiusKm : null;
  if (
    lat != null &&
    lng != null &&
    radiusKm != null &&
    listing.geoLat != null &&
    listing.geoLng != null
  ) {
    const d = haversineKm(lat, lng, listing.geoLat, listing.geoLng);
    if (d > radiusKm) return false;
  }

  return true;
}

export function savedSearchLabel(
  name: string,
  filters: Record<string, unknown>,
): string {
  if (name?.trim()) return name.trim();
  if (typeof filters.q === 'string' && filters.q.trim()) return filters.q.trim();
  if (typeof filters.brand === 'string' && filters.brand.trim()) {
    return filters.brand.trim();
  }
  return 'items';
}

export { normalizeCity, DEFAULT_CITY };
