/* eslint-disable @typescript-eslint/no-explicit-any */
import { CircularService } from './circular.service';

describe('Phase 3.2 circular hand-offs', () => {
  it('complete hand-off writes receipt + listing audit and notifies seller', async () => {
    const listing = {
      id: 'list-1',
      sellerId: 'seller-1',
      title: 'Dining table',
      status: 'LIVE',
      city: 'Lagos',
    };
    const partner = {
      id: 'partner-1',
      name: 'Lagos Recycle Hub',
      kind: 'RECYCLER',
      active: true,
    };
    const handoff = {
      id: 'ho-1',
      listingId: listing.id,
      sellerId: listing.sellerId,
      circularPartnerId: partner.id,
      status: 'SCHEDULED',
      scheduledAt: new Date(),
      completedAt: null,
      receiptKey: null,
      recipientLabel: partner.name,
      partner,
      listing,
    };

    const events: any[] = [];
    const notifications = {
      notify: jest.fn(async () => ({ created: [], skipped: [] })),
    };

    const prisma: any = {
      circularHandoff: {
        findUnique: jest.fn(async () => ({ ...handoff })),
        update: jest.fn(async ({ data }: any) => ({
          ...handoff,
          ...data,
          partner,
          listing: { ...listing, status: 'REMOVED' },
        })),
      },
      listing: {
        update: jest.fn(async ({ data }: any) => ({ ...listing, ...data })),
      },
      listingEvent: {
        create: jest.fn(async ({ data }: any) => {
          events.push(data);
          return data;
        }),
      },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };

    const svc = new CircularService(prisma, notifications as any);
    const out = await svc.completeHandoff('ho-1', 'seller-1');

    expect(out.status).toBe('COMPLETED');
    expect(out.receiptKey).toMatch(/^receipts\/circular\//);
    expect(events).toHaveLength(1);
    expect(events[0].payload.reason).toBe('circular_handoff');
    expect(events[0].payload.receiptKey).toBe(out.receiptKey);
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'seller-1',
        body: expect.stringContaining(
          'Your Dining table was donated to Lagos Recycle Hub',
        ),
      }),
    );
  });

  it('donate-if-unsold scheduler schedules due LIVE listings', async () => {
    const publishedAt = new Date(Date.now() - 10 * 86_400_000);
    const listing = {
      id: 'list-due',
      sellerId: 's1',
      status: 'LIVE',
      city: 'Lagos',
      donateIfUnsoldDays: 7,
      publishedAt,
    };
    const creates: any[] = [];
    const prisma: any = {
      listing: {
        findMany: jest.fn(async () => [listing]),
      },
      circularHandoff: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => {
          creates.push(data);
          return data;
        }),
      },
      circularPartner: {
        findFirst: jest.fn(async () => ({
          id: 'cp-1',
          name: 'GiveBack NGO',
          city: 'Lagos',
          active: true,
          verified: true,
        })),
      },
    };
    const svc = new CircularService(prisma);
    const n = await svc.processDonateIfUnsold(new Date());
    expect(n).toBe(1);
    expect(creates[0].circularPartnerId).toBe('cp-1');
    expect(creates[0].status).toBe('SCHEDULED');
  });
});
