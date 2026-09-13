import { FavouritesService } from './favourites.service';
import { DiscoveryAnalyticsService } from '../discovery/discovery-analytics.service';

describe('FavouritesService', () => {
  it('favourite save persists and emits SAVED event', async () => {
    const prisma = {
      listing: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'listing-1',
          status: 'LIVE',
        }),
      },
      favourite: {
        upsert: jest.fn().mockResolvedValue({
          id: 'fav-1',
          userId: 'user-1',
          listingId: 'listing-1',
        }),
      },
      listingEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const analytics = new DiscoveryAnalyticsService();
    const spy = jest.spyOn(analytics, 'listingSaved');

    const service = new FavouritesService(prisma as never, analytics);
    const result = await service.favourite('user-1', 'listing-1');

    expect(result).toEqual({ ok: true, favouriteId: 'fav-1' });
    expect(prisma.favourite.upsert).toHaveBeenCalledWith({
      where: {
        userId_listingId: { userId: 'user-1', listingId: 'listing-1' },
      },
      create: { userId: 'user-1', listingId: 'listing-1' },
      update: {},
    });
    expect(prisma.listingEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        listingId: 'listing-1',
        type: 'SAVED',
        actorUserId: 'user-1',
      }),
    });
    expect(spy).toHaveBeenCalledWith({
      userId: 'user-1',
      listingId: 'listing-1',
    });
  });

  it('onListingLive increments matching saved searches', async () => {
    const prisma = {
      savedSearch: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ss-1',
            filters: { community: 'LEKKI_PH1', priceMaxKobo: 500_000_00 },
          },
          {
            id: 'ss-2',
            filters: { community: 'VGC' },
          },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const service = new FavouritesService(
      prisma as never,
      new DiscoveryAnalyticsService(),
    );

    await service.onListingLive({
      id: 'l1',
      title: 'Sofa',
      description: 'Nice',
      categoryId: null,
      subcategoryId: null,
      priceKobo: 200_000_00,
      condition: 'GOOD',
      community: 'LEKKI_PH1',
      city: 'Lagos',
      fulfilmentDelivery: false,
    });

    expect(prisma.savedSearch.findMany).toHaveBeenCalledWith({
      where: { paused: false },
      take: 500,
    });
    expect(prisma.savedSearch.update).toHaveBeenCalledTimes(1);
    expect(prisma.savedSearch.update).toHaveBeenCalledWith({
      where: { id: 'ss-1' },
      data: {
        newMatchesCount: { increment: 1 },
      },
    });
  });
});
