/** Default discovery / comps / alert city (PRD Lagos-first). */
export const DEFAULT_CITY =
  process.env.INTELLIGENCE_CITY_DEFAULT?.trim() || 'Lagos';

/** Normalize city labels for comparison. */
export function normalizeCity(city: string | null | undefined): string {
  const c = (city ?? DEFAULT_CITY).trim();
  return c.length > 0 ? c : DEFAULT_CITY;
}

/** Throw if two city scopes differ (hard filter for cross-city leakage). */
export function assertSameCity(
  a: string | null | undefined,
  b: string | null | undefined,
): void {
  if (normalizeCity(a) !== normalizeCity(b)) {
    throw new Error(
      `City mismatch: ${normalizeCity(a)} !== ${normalizeCity(b)}`,
    );
  }
}

/** Prisma where fragment for listing city filter. */
export function listingCityWhere(
  city?: string | null,
): { city: string } {
  return { city: normalizeCity(city) };
}

export function citiesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return normalizeCity(a) === normalizeCity(b);
}
