import {
  haversineKm,
  PostgresFullTextSearchProvider,
} from '../providers/search.provider';
import { toPublicListing } from '../listings/public-listing.mapper';

/** Victoria Island centroid from MockGeocodingProvider */
const VI = { lat: 6.4281, lng: 3.4219 };

describe('search geo distance', () => {
  it('orders nearer listings first within 5km of VI', async () => {
    const near = {
      id: 'near-id',
      title: 'Near VI sofa',
      description: 'close',
      brand: null,
      model: null,
      condition: 'GOOD',
      priceKobo: 100_000_00,
      negotiable: true,
      sellingMode: 'SELL',
      status: 'LIVE',
      community: 'VI',
      geoLat: 6.43,
      geoLng: 3.425,
      fulfilmentPickup: true,
      fulfilmentMeet: true,
      fulfilmentDelivery: false,
      createdAt: new Date('2026-01-02'),
      publishedAt: new Date('2026-01-02'),
      vehicle: null,
      category: { id: 'c1', slug: 'home-furniture', name: 'Home' },
      images: [],
      seller: {
        id: 's1',
        profile: { displayName: 'A' },
        verifications: [],
      },
    };
    const far = {
      ...near,
      id: 'far-id',
      title: 'Far Ajah sofa',
      community: 'AJAH',
      geoLat: 6.4667,
      geoLng: 3.5667,
      createdAt: new Date('2026-01-03'),
      publishedAt: new Date('2026-01-03'),
    };

    const prisma = {
      listing: {
        findMany: jest.fn().mockResolvedValue([far, near]),
      },
    };

    const provider = new PostgresFullTextSearchProvider(prisma as never);
    const result = await provider.search({
      lat: VI.lat,
      lng: VI.lng,
      radiusKm: 5,
      sort: 'distance',
    });

    expect(haversineKm(VI.lat, VI.lng, near.geoLat, near.geoLng)).toBeLessThan(
      5,
    );
    expect(haversineKm(VI.lat, VI.lng, far.geoLat, far.geoLng)).toBeGreaterThan(
      5,
    );
    expect(result.items.map((i) => i.id)).toEqual(['near-id']);
    expect(result.items[0].distanceKm).toBeLessThan(5);
    expect(result.items.every((i) => !('addressPrivate' in i))).toBe(true);
  });

  it('public mapper never leaks addressPrivate on search hits', () => {
    const dto = toPublicListing({
      id: 'x',
      title: 'T',
      description: 'D',
      brand: null,
      model: null,
      condition: 'GOOD',
      priceKobo: 1,
      negotiable: true,
      sellingMode: 'SELL',
      status: 'LIVE',
      community: 'VI',
      geoLat: VI.lat,
      geoLng: VI.lng,
      fulfilmentPickup: true,
      fulfilmentMeet: true,
      fulfilmentDelivery: false,
      createdAt: new Date(),
      publishedAt: new Date(),
      vehicle: null,
      addressPrivate: 'SECRET STREET',
      images: [],
      seller: { id: 's', profile: { displayName: 'S' }, verifications: [] },
    });
    expect(dto).not.toHaveProperty('addressPrivate');
    expect(JSON.stringify(dto)).not.toContain('SECRET STREET');
  });
});
