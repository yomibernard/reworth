export type GeocodeResult = {
  community: string;
  geoLat: number;
  geoLng: number;
  label: string;
};

export interface GeocodingProvider {
  readonly name: string;
  geocodeCommunity(community: string): Promise<GeocodeResult | null>;
  reverse?(lat: number, lng: number): Promise<GeocodeResult | null>;
}

export const GEOCODING_PROVIDER = Symbol('GEOCODING_PROVIDER');

/** Fixture coordinates for Lagos communities (approx centroids). */
export class MockGeocodingProvider implements GeocodingProvider {
  readonly name = 'mock-geocoding';

  private readonly fixtures: Record<string, GeocodeResult> = {
    LEKKI_PH1: {
      community: 'LEKKI_PH1',
      geoLat: 6.4474,
      geoLng: 3.4721,
      label: 'Lekki Phase 1',
    },
    IKOYI: {
      community: 'IKOYI',
      geoLat: 6.4541,
      geoLng: 3.4358,
      label: 'Ikoyi',
    },
    VI: {
      community: 'VI',
      geoLat: 6.4281,
      geoLng: 3.4219,
      label: 'Victoria Island',
    },
    ONIRU: {
      community: 'ONIRU',
      geoLat: 6.435,
      geoLng: 3.45,
      label: 'Oniru',
    },
    VGC: {
      community: 'VGC',
      geoLat: 6.4698,
      geoLng: 3.565,
      label: 'VGC',
    },
    CHEVRON: {
      community: 'CHEVRON',
      geoLat: 6.441,
      geoLng: 3.52,
      label: 'Chevron',
    },
    AJAH: {
      community: 'AJAH',
      geoLat: 6.4667,
      geoLng: 3.5667,
      label: 'Ajah',
    },
    OTHER_LAGOS: {
      community: 'OTHER_LAGOS',
      geoLat: 6.5244,
      geoLng: 3.3792,
      label: 'Lagos',
    },
  };

  async geocodeCommunity(community: string): Promise<GeocodeResult | null> {
    const key = community.trim().toUpperCase().replace(/\s+/g, '_');
    if (this.fixtures[key]) return this.fixtures[key];
    // soft aliases
    if (/lekki/.test(community.toLowerCase())) return this.fixtures.LEKKI_PH1;
    if (/ikoyi/.test(community.toLowerCase())) return this.fixtures.IKOYI;
    if (/victoria|vi\b/.test(community.toLowerCase())) return this.fixtures.VI;
    return this.fixtures.OTHER_LAGOS;
  }
}
