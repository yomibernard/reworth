/* eslint-disable @typescript-eslint/no-explicit-any */
import { SellerAnalyticsService } from './seller-analytics.service';

describe('SellerAnalyticsService', () => {
  it('aggregates 5 completed sales revenue/conversion without buyer identity', async () => {
    const now = Date.now();
    const listings = Array.from({ length: 5 }, (_, i) => ({
      id: `listing-${i}`,
      title: `Item ${i}`,
      status: i < 5 ? 'SOLD' : 'LIVE',
      city: 'Lagos',
      priceKobo: (100 + i * 10) * 100_000,
      views: 10 + i,
      categoryId: 'cat-1',
      createdAt: new Date(now - 20 * 86_400_000),
      events: [
        { type: 'VIEWED' },
        { type: 'VIEWED' },
        { type: 'SAVED' },
      ],
      offers: [{ id: `o-${i}-1` }, { id: `o-${i}-2` }],
      orders: [
        {
          amountKobo: (90 + i * 10) * 100_000,
          completedAt: new Date(now - (i + 1) * 86_400_000),
          createdAt: new Date(now - 15 * 86_400_000),
          // buyerId must NEVER leak into response
          buyerId: `buyer-secret-${i}`,
        },
      ],
    }));

    const prisma = {
      listing: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(listings)
          .mockResolvedValue(
            // peers for market mid
            listings.map((l) => ({ priceKobo: l.priceKobo })),
          ),
      },
      trustScore: {
        findUnique: jest.fn().mockResolvedValue({
          medianResponseMinutes: 45.6,
        }),
      },
    };

    const svc = new SellerAnalyticsService(prisma as never);
    const result = await svc.getForSeller('seller-1', 'Lagos');

    expect(result.sellerId).toBe('seller-1');
    expect(result.aggregate.revenue30dKobo).toBeGreaterThan(0);
    expect(result.aggregate.revenue90dKobo).toBe(
      result.aggregate.revenue30dKobo,
    );
    expect(result.aggregate.offerToSaleConversion).toBeCloseTo(5 / 10);
    expect(result.aggregate.responseMinutes).toBe(46);
    expect(result.listings).toHaveLength(5);

    const json = JSON.stringify(result);
    expect(json).not.toMatch(/buyer-secret/);
    expect(json).not.toMatch(/"buyerId"/);
    expect(json).not.toMatch(/"email"/);
    expect(json).not.toMatch(/"phone"/);
    expect(result).not.toHaveProperty('buyers');
  });
});
