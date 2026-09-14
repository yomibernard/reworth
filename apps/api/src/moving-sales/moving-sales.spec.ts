/* eslint-disable @typescript-eslint/no-explicit-any */
import { MovingSaleExpiryScheduler } from './moving-sale-expiry.scheduler';
import { MovingSalesService } from './moving-sales.service';

describe('Phase 2.2 Moving Sales', () => {
  describe('totals with price changes', () => {
    it('combinedAskingPriceKobo reflects live listing prices', async () => {
      const sale = {
        id: 'ms-1',
        sellerId: 'seller-1',
        title: 'Relocating Lekki',
        blurb: '',
        deadline: new Date(Date.now() + 7 * 86_400_000),
        community: 'Lekki',
        communityId: null,
        geoLat: 6.44,
        geoLng: 3.47,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        seller: { id: 'seller-1', profile: { displayName: 'Ada' } },
        estate: null,
        follows: [],
        listings: [
          {
            id: 'l1',
            status: 'LIVE',
            priceKobo: 100_000_00,
            title: 'Sofa',
            description: '',
            brand: null,
            model: null,
            condition: 'GOOD',
            negotiable: true,
            sellingMode: 'SELL',
            community: 'Lekki',
            communityId: null,
            communityOnly: false,
            geoLat: null,
            geoLng: null,
            fulfilmentPickup: true,
            fulfilmentMeet: true,
            fulfilmentDelivery: false,
            createdAt: new Date(),
            publishedAt: new Date(),
            vehicle: null,
            images: [],
            seller: { profile: { displayName: 'Ada' }, verifications: [] },
            category: null,
            estateCommunity: null,
            movingSale: null,
          },
          {
            id: 'l2',
            status: 'LIVE',
            priceKobo: 50_000_00,
            title: 'Table',
            description: '',
            brand: null,
            model: null,
            condition: 'GOOD',
            negotiable: true,
            sellingMode: 'SELL',
            community: 'Lekki',
            communityId: null,
            communityOnly: false,
            geoLat: null,
            geoLng: null,
            fulfilmentPickup: true,
            fulfilmentMeet: true,
            fulfilmentDelivery: false,
            createdAt: new Date(),
            publishedAt: new Date(),
            vehicle: null,
            images: [],
            seller: { profile: { displayName: 'Ada' }, verifications: [] },
            category: null,
            estateCommunity: null,
            movingSale: null,
          },
          {
            id: 'l3',
            status: 'DRAFT',
            priceKobo: 999_000_00,
            title: 'Draft',
            description: '',
            brand: null,
            model: null,
            condition: 'GOOD',
            negotiable: true,
            sellingMode: 'SELL',
            community: 'Lekki',
            communityId: null,
            communityOnly: false,
            geoLat: null,
            geoLng: null,
            fulfilmentPickup: true,
            fulfilmentMeet: true,
            fulfilmentDelivery: false,
            createdAt: new Date(),
            publishedAt: null,
            vehicle: null,
            images: [],
            seller: { profile: { displayName: 'Ada' }, verifications: [] },
            category: null,
            estateCommunity: null,
            movingSale: null,
          },
        ],
      };

      const prisma: any = {
        movingSale: {
          findUnique: jest.fn().mockResolvedValue(sale),
        },
      };
      const service = new MovingSalesService(prisma);
      const dto = await service.getById('ms-1', 'viewer-1');
      expect(dto.itemCount).toBe(2);
      expect(dto.combinedAskingPriceKobo).toBe(150_000_00);

      // Price change on live item
      sale.listings[0]!.priceKobo = 80_000_00;
      const after = await service.getById('ms-1', 'viewer-1');
      expect(after.combinedAskingPriceKobo).toBe(130_000_00);
    });
  });

  describe('deadline expiry', () => {
    it('marks ACTIVE past deadline as COMPLETED; listings untouched', async () => {
      const listingUpdateMany = jest.fn();
      const prisma: any = {
        movingSale: {
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        listing: { updateMany: listingUpdateMany },
      };
      const service = new MovingSalesService(prisma);
      const count = await service.expireDueSales(new Date());
      expect(count).toBe(2);
      expect(prisma.movingSale.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          deadline: { lt: expect.any(Date) },
        },
        data: { status: 'COMPLETED' },
      });
      expect(listingUpdateMany).not.toHaveBeenCalled();
    });

    it('scheduler delegates to expireDueSales', async () => {
      const movingSales = {
        expireDueSales: jest.fn().mockResolvedValue(3),
      };
      const scheduler = new MovingSaleExpiryScheduler(
        movingSales as never,
        { get: () => 'false' } as never,
      );
      const n = await scheduler.expireAll();
      expect(n).toBe(3);
      expect(movingSales.expireDueSales).toHaveBeenCalled();
    });
  });

  describe('attach ownership', () => {
    it('rejects attaching listings not owned by seller', async () => {
      const prisma: any = {
        movingSale: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'ms-1',
            sellerId: 'seller-1',
          }),
        },
        listing: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'l1', sellerId: 'other-seller' },
          ]),
          updateMany: jest.fn(),
        },
      };
      const service = new MovingSalesService(prisma);
      await expect(
        service.attachListings('ms-1', 'seller-1', { listingIds: ['l1'] }),
      ).rejects.toMatchObject({ name: 'ForbiddenException' });
    });
  });
});
