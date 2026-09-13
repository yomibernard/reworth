import { ListingExpiryScheduler } from './listing-expiry.scheduler';
import { ConfigService } from '@nestjs/config';

describe('ListingExpiryScheduler', () => {
  it('marks LIVE past expiresAt as EXPIRED and emits event', async () => {
    const due = [{ id: 'listing-1', status: 'LIVE' as const }];
    const prisma = {
      listing: {
        findMany: jest.fn().mockResolvedValue(due),
        update: jest.fn().mockResolvedValue({}),
      },
      listingEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const config = {
      get: () => 'false',
    } as unknown as ConfigService;

    const scheduler = new ListingExpiryScheduler(prisma as never, config);
    const count = await scheduler.expireDueListings(new Date());
    expect(count).toBe(1);
    expect(prisma.listing.update).toHaveBeenCalledWith({
      where: { id: 'listing-1' },
      data: { status: 'EXPIRED' },
    });
    expect(prisma.listingEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          listingId: 'listing-1',
          type: 'STATUS_CHANGED',
        }),
      }),
    );
  });
});
