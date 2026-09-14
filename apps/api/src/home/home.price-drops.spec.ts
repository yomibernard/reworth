import { HomeService } from './home.service';
import { RecommendationService } from './recommendation.service';
import { DiscoveryAnalyticsService } from '../discovery/discovery-analytics.service';

describe('HomeService price drops rail', () => {
  it('includes listings with ≥5% PRICE_CHANGED drop', async () => {
    const prisma = {
      listingEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            listingId: 'drop-ok',
            type: 'PRICE_CHANGED',
            payload: { from: 100_000_00, to: 90_000_00 }, // 10%
          },
          {
            listingId: 'drop-small',
            type: 'PRICE_CHANGED',
            payload: { from: 100_000_00, to: 97_000_00 }, // 3%
          },
          {
            listingId: 'drop-raise',
            type: 'PRICE_CHANGED',
            payload: { from: 100_000_00, to: 110_000_00 },
          },
        ]),
      },
      listing: {
        findMany: jest.fn().mockResolvedValue([
          baseListing('drop-ok', 'Dropped sofa'),
          baseListing('drop-small', 'Tiny drop'),
          baseListing('drop-raise', 'Raised'),
          baseListing('other', 'No event'),
        ]),
      },
    };

    const cache = {
      gridCell: () => 'nogeo',
      buildKey: () => 'home:all:all:nogeo',
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const movingSales = {
      topForHome: jest.fn().mockResolvedValue([]),
    };
    const visibility = {
      visibleListingWhere: jest.fn().mockReturnValue({}),
    };

    const service = new HomeService(
      prisma as never,
      cache as never,
      new RecommendationService(),
      new DiscoveryAnalyticsService(),
      movingSales as never,
      visibility as never,
    );

    const ids = await service.priceDropListingIds(5);
    expect(ids).toContain('drop-ok');
    expect(ids).not.toContain('drop-small');
    expect(ids).not.toContain('drop-raise');

    const home = await service.getHome({});
    const rail = home.rails.find((r) => r.id === 'price_drops');
    expect(rail).toBeDefined();
    expect(rail!.items.map((i) => i.id)).toEqual(['drop-ok']);
    expect(home.rails.find((r) => r.id === 'moving_sales')?.emptyMessage).toBe(
      'No active moving sales nearby',
    );
  });
});

function baseListing(id: string, title: string) {
  return {
    id,
    title,
    description: '',
    brand: null,
    model: null,
    condition: 'GOOD',
    priceKobo: 90_000_00,
    negotiable: true,
    sellingMode: 'SELL',
    status: 'LIVE',
    community: 'LEKKI_PH1',
    geoLat: 6.44,
    geoLng: 3.47,
    fulfilmentPickup: true,
    fulfilmentMeet: true,
    fulfilmentDelivery: false,
    createdAt: new Date('2026-01-01'),
    publishedAt: new Date('2026-01-01'),
    vehicle: null,
    views: 10,
    category: null,
    subcategory: null,
    images: [],
    seller: {
      id: 's1',
      profile: { displayName: 'Ada' },
      verifications: [],
    },
    events: [],
  };
}
