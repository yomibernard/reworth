export type RegionGeocodeEntry = {
  lat: number;
  lng: number;
  label?: string;
};

export type RegionLogistics = {
  baseFeeKobo: number;
  perKmKobo: number;
};

export type RegionPriceBand = {
  minKobo: number;
  maxKobo: number | null;
};

export type RegionStatus = 'pilot' | 'supply' | 'disabled';

export type RegionConfig = {
  city: string;
  displayName: string;
  timezone: string;
  communities: string[];
  geocoding: Record<string, RegionGeocodeEntry>;
  logistics: RegionLogistics;
  priceBands: Record<string, RegionPriceBand>;
  sms: { enabled: boolean; provider?: string };
  psp: { enabled: boolean; provider?: string };
  /** Public picker: pilot cities only. supply = ops/config-ready, not marketed. */
  status?: RegionStatus;
};

export const REGION_REQUIRED_KEYS = [
  'city',
  'displayName',
  'timezone',
  'communities',
  'geocoding',
  'logistics',
  'priceBands',
  'sms',
  'psp',
] as const;

export const DEFAULT_CITY_KEY = 'lagos';

/** Default consumer pilot set (Lagos + Abuja). Override via REGION_PILOT_CITIES. */
export const DEFAULT_PILOT_CITY_KEYS = ['lagos', 'abuja'] as const;
