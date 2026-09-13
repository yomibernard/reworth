import { MockRoomScanVisionProvider } from './mock-room-scan-vision.provider';
import { PRD_ROOM_SCAN_FIXTURE } from './room-scan-vision.provider';
import { RoomScanService } from './room-scan.service';

describe('Room scan (Phase 3.1)', () => {
  it('mock vision returns fixed PRD 6 detections for any input', async () => {
    const vision = new MockRoomScanVisionProvider();
    const a = await vision.detect(['a.jpg', 'b.jpg']);
    const b = await vision.detect([]);
    expect(a).toHaveLength(6);
    expect(b).toHaveLength(6);
    expect(a.map((d) => d.label)).toEqual(
      PRD_ROOM_SCAN_FIXTURE.map((d) => d.label),
    );
    expect(a.map((d) => d.label)).toEqual([
      'Samsung television',
      'LG soundbar',
      'Dining table',
      '6 dining chairs',
      'Coffee table',
      'Floor lamp',
    ]);
  });

  it('createDrafts is idempotent (same scan won\'t duplicate drafts)', async () => {
    const draftsStore: Array<{ listingId: string; itemLabel: string }> = [];
    const items = PRD_ROOM_SCAN_FIXTURE.map((d, i) => ({
      id: `item-${i}`,
      label: d.label,
      brandHint: d.brandHint ?? null,
      categoryHint: d.categoryHint ?? null,
      cropKey: d.cropKey ?? null,
      selected: true,
      condition: 'GOOD',
      sortOrder: i,
      roomScanId: 'scan-1',
    }));

    let listingSeq = 0;
    const prisma: any = {
      roomScan: {
        findUnique: jest.fn().mockImplementation(async () => ({
          id: 'scan-1',
          userId: 'user-1',
          city: 'Lagos',
          status: draftsStore.length ? 'DRAFTS_CREATED' : 'READY',
          photoKeys: ['p1'],
          items,
          drafts: draftsStore.map((d, i) => ({
            id: `draft-${i}`,
            roomScanId: 'scan-1',
            ...d,
          })),
        })),
        update: jest.fn().mockImplementation(async ({ data }: any) => ({
          id: 'scan-1',
          userId: 'user-1',
          city: 'Lagos',
          ...data,
          items,
          drafts: draftsStore.map((d, i) => ({
            id: `draft-${i}`,
            roomScanId: 'scan-1',
            ...d,
          })),
        })),
      },
      roomScanDraft: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          draftsStore.push({
            listingId: data.listingId,
            itemLabel: data.itemLabel,
          });
          return { id: `draft-${draftsStore.length}`, ...data };
        }),
      },
      listingImage: { create: jest.fn().mockResolvedValue({}) },
    };

    const listings = {
      create: jest.fn().mockImplementation(async () => {
        listingSeq++;
        return { id: `listing-${listingSeq}` };
      }),
      publish: jest.fn(),
    };
    const ai = {
      name: 'mock',
      draftListing: jest.fn().mockResolvedValue({
        title: 'Item',
        description: 'Desc',
        suggestedCategory: 'Other',
        suggestedCondition: 'GOOD',
        suggestedPriceNaira: 50_000,
        suggestedPriceLowNaira: 40_000,
        suggestedPriceHighNaira: 60_000,
        tags: [],
      }),
    };
    const vision = new MockRoomScanVisionProvider();
    const analytics = { log: jest.fn() };
    const config = { get: () => '8' };

    const svc = new RoomScanService(
      prisma,
      config as never,
      analytics as never,
      listings as never,
      vision,
      ai as never,
    );

    const first = await svc.createDrafts('scan-1', 'user-1');
    expect(first.idempotent).toBe(false);
    expect(first.drafts).toHaveLength(6);
    expect(listings.create).toHaveBeenCalledTimes(6);

    const second = await svc.createDrafts('scan-1', 'user-1');
    expect(second.idempotent).toBe(true);
    expect(listings.create).toHaveBeenCalledTimes(6);
  });
});
