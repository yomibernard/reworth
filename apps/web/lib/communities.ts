/**
 * Pilot community chips (Lagos + Abuja). Prefer city-scoped helpers.
 */

export const LAGOS_COMMUNITIES = [
  "Lekki Ph1",
  "Ikoyi",
  "VI",
  "Oniru",
  "VGC",
  "Chevron",
  "Ajah",
  "Other Lagos",
] as const;

export const ABUJA_COMMUNITIES = [
  "Maitama",
  "Asokoro",
  "Wuse",
  "Garki",
  "Jabi",
  "Guzape",
  "Other Abuja",
] as const;

/** Union of all pilot communities (onboarding / legacy selects). */
export const COMMUNITIES = [
  ...LAGOS_COMMUNITIES,
  ...ABUJA_COMMUNITIES,
] as const;

export type Community = (typeof COMMUNITIES)[number];

export function normalizeCityKey(city?: string | null): string {
  if (!city) return "lagos";
  return city
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

export function cityDisplayName(cityKey?: string | null): string {
  const key = normalizeCityKey(cityKey);
  if (key === "abuja") return "Abuja";
  if (key === "lagos") return "Lagos";
  if (!cityKey) return "Lagos";
  return cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
}

/** Human community labels for a region key or display name. */
export function communitiesForCity(city?: string | null): readonly string[] {
  const key = normalizeCityKey(city);
  if (key === "abuja") return ABUJA_COMMUNITIES;
  return LAGOS_COMMUNITIES;
}
