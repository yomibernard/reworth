/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  formatSavedSearchAlertBody,
  SavedSearchAlertsService,
} from './saved-search-alerts.service';

describe('SavedSearchAlertsService', () => {
  it('formats batch wording singular and plural', () => {
    expect(formatSavedSearchAlertBody(1, 'Samsung TV')).toBe(
      '1 new Samsung TV was listed near you',
    );
    expect(formatSavedSearchAlertBody(3, 'Samsung TV')).toBe(
      '3 new Samsung TV were listed near you',
    );
  });

  it('skips paused searches', async () => {
    const prisma = {
      savedSearch: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const notifications = { notify: jest.fn() };
    const svc = new SavedSearchAlertsService(
      prisma as never,
      notifications as never,
    );
    const result = await svc.evaluateActiveSearches();
    expect(prisma.savedSearch.findMany).toHaveBeenCalledWith({
      where: { paused: false },
      take: 2_000,
    });
    expect(result.notified).toBe(0);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('skips city mismatch and dedupes so notify is once', async () => {
    const search = {
      id: 'ss-1',
      userId: 'u1',
      name: 'Samsung TV',
      paused: false,
      filters: { city: 'Lagos', q: 'samsung' },
      lastCheckedAt: null,
      newMatchesCount: 0,
    };

    const lagosMatch = {
      id: 'l-lagos',
      title: 'Samsung TV 55',
      description: 'Nice samsung',
      categoryId: null,
      subcategoryId: null,
      priceKobo: 300_000_00,
      condition: 'GOOD',
      community: 'LEKKI',
      city: 'Lagos',
      fulfilmentDelivery: true,
      geoLat: null,
      geoLng: null,
      brand: 'Samsung',
      publishedAt: new Date(),
      updatedAt: new Date(),
      status: 'LIVE',
    };
    const abuja = {
      ...lagosMatch,
      id: 'l-abuja',
      city: 'Abuja',
      title: 'Samsung TV Abuja',
    };

    const dedupeStore = new Set<string>();
    const prisma = {
      savedSearch: {
        findMany: jest.fn().mockResolvedValue([search]),
        update: jest.fn().mockResolvedValue({}),
      },
      listing: {
        findMany: jest.fn().mockResolvedValue([lagosMatch, abuja]),
      },
      savedSearchAlertDedupe: {
        findUnique: jest.fn(async ({ where }: any) => {
          const key = `${where.savedSearchId_listingId.savedSearchId}:${where.savedSearchId_listingId.listingId}`;
          return dedupeStore.has(key) ? { id: 'x' } : null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const key = `${data.savedSearchId}:${data.listingId}`;
          if (dedupeStore.has(key)) throw new Error('unique');
          dedupeStore.add(key);
          return data;
        }),
      },
    };

    const notifications = {
      notify: jest.fn().mockResolvedValue({ created: [], skipped: [] }),
    };

    const svc = new SavedSearchAlertsService(
      prisma as never,
      notifications as never,
    );

    await svc.evaluateActiveSearches(new Date());
    // City filter on query means Abuja not returned — but we returned both;
    // matcher should drop Abuja. Lagos match notifies once.
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        category: 'SAVED_SEARCH_MATCH',
        body: '1 new Samsung TV was listed near you',
      }),
    );

    // Second run — same listing already deduped → no notify
    notifications.notify.mockClear();
    await svc.evaluateActiveSearches(new Date());
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('respects notify path (caps handled inside NotificationsService)', async () => {
    const search = {
      id: 'ss-2',
      userId: 'u2',
      name: 'items',
      paused: false,
      filters: { city: 'Lagos' },
      lastCheckedAt: new Date(Date.now() - 60_000),
      newMatchesCount: 0,
    };
    const listing = {
      id: 'l2',
      title: 'Chair',
      description: 'ok',
      categoryId: null,
      subcategoryId: null,
      priceKobo: 10_000_00,
      condition: 'GOOD',
      community: '',
      city: 'Lagos',
      fulfilmentDelivery: false,
      geoLat: null,
      geoLng: null,
      brand: null,
      publishedAt: new Date(),
      updatedAt: new Date(),
      status: 'LIVE',
    };
    const prisma = {
      savedSearch: {
        findMany: jest.fn().mockResolvedValue([search]),
        update: jest.fn().mockResolvedValue({}),
      },
      listing: { findMany: jest.fn().mockResolvedValue([listing]) },
      savedSearchAlertDedupe: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const notifications = {
      notify: jest.fn().mockResolvedValue({
        created: [{ id: 'n1', channel: 'IN_APP' }],
        skipped: [{ channel: 'PUSH', reason: 'frequency_cap_digest' }],
      }),
    };
    const svc = new SavedSearchAlertsService(
      prisma as never,
      notifications as never,
    );
    const r = await svc.evaluateActiveSearches();
    expect(r.notified).toBe(1);
    expect(notifications.notify).toHaveBeenCalled();
  });
});
