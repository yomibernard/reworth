/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommunityPrivacy } from '@prisma/client';
import { CommunityVisibilityService } from './community-visibility.service';
import { CommunitiesService } from './communities.service';
import { ListingsService } from '../listings/listings.service';

function configStub(overrides: Record<string, string> = {}): ConfigService {
  const map: Record<string, string> = {
    COMMUNITY_INVITE_EXPIRY_DAYS: '7',
    ...overrides,
  };
  return { get: (k: string) => map[k] } as unknown as ConfigService;
}

describe('Phase 2.2 Communities', () => {
  describe('membership gating matrix', () => {
    const cases: Array<{
      privacy: CommunityPrivacy;
      communityOnly: boolean;
      member: boolean;
      expectView: boolean;
    }> = [
      { privacy: 'PUBLIC', communityOnly: false, member: false, expectView: true },
      { privacy: 'PUBLIC', communityOnly: false, member: true, expectView: true },
      { privacy: 'SEMI_PRIVATE', communityOnly: false, member: false, expectView: true },
      { privacy: 'SEMI_PRIVATE', communityOnly: false, member: true, expectView: true },
      { privacy: 'PRIVATE', communityOnly: false, member: false, expectView: false },
      { privacy: 'PRIVATE', communityOnly: false, member: true, expectView: true },
      { privacy: 'PUBLIC', communityOnly: true, member: false, expectView: false },
      { privacy: 'PUBLIC', communityOnly: true, member: true, expectView: true },
      { privacy: 'SEMI_PRIVATE', communityOnly: true, member: false, expectView: false },
      { privacy: 'PRIVATE', communityOnly: true, member: false, expectView: false },
      { privacy: 'PRIVATE', communityOnly: true, member: true, expectView: true },
    ];

    for (const c of cases) {
      it(`${c.privacy} communityOnly=${c.communityOnly} member=${c.member} → view=${c.expectView}`, async () => {
        const prisma: any = {
          community: {
            findUnique: jest.fn().mockResolvedValue({ privacy: c.privacy }),
          },
          communityMembership: {
            findUnique: jest.fn().mockResolvedValue(
              c.member ? { status: 'MEMBER' } : null,
            ),
          },
        };
        const visibility = new CommunityVisibilityService(prisma);
        const ok = await visibility.canViewListing(
          {
            sellerId: 'seller-1',
            communityId: 'comm-1',
            communityOnly: c.communityOnly,
            estateCommunity: { privacy: c.privacy },
          },
          'viewer-1',
        );
        expect(ok).toBe(c.expectView);
      });
    }

    it('seller always views own private listing', async () => {
      const prisma: any = {
        communityMembership: { findUnique: jest.fn() },
      };
      const visibility = new CommunityVisibilityService(prisma);
      const ok = await visibility.canViewListing(
        {
          sellerId: 'seller-1',
          communityId: 'comm-1',
          communityOnly: true,
          estateCommunity: { privacy: 'PRIVATE' },
        },
        'seller-1',
      );
      expect(ok).toBe(true);
      expect(prisma.communityMembership.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('invite single-use + expiry', () => {
    it('redeems once then rejects second use', async () => {
      const invite = {
        id: 'inv-1',
        communityId: 'comm-1',
        code: 'ABC123',
        maxUses: 1,
        useCount: 0,
        expiresAt: new Date(Date.now() + 86_400_000),
      };
      let useCount = 0;
      const tx = {
        communityInvite: {
          updateMany: jest.fn().mockImplementation(async () => {
            if (useCount >= invite.maxUses) return { count: 0 };
            useCount += 1;
            return { count: 1 };
          }),
        },
        communityMembership: {
          upsert: jest.fn().mockResolvedValue({
            id: 'mem-1',
            communityId: 'comm-1',
            userId: 'user-1',
            status: 'MEMBER',
            joinedAt: new Date(),
            createdAt: new Date(),
          }),
        },
      };
      const prisma: any = {
        communityInvite: {
          findUnique: jest.fn().mockImplementation(async () => ({
            ...invite,
            useCount,
          })),
          create: jest.fn(),
        },
        community: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'comm-1',
            active: true,
            privacy: 'PRIVATE',
          }),
        },
        communityMembership: {
          findUnique: jest.fn().mockResolvedValue({ status: 'MEMBER' }),
        },
        communityManager: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn(async (fn: any) => fn(tx)),
      };
      const visibility = new CommunityVisibilityService(prisma);
      const service = new CommunitiesService(
        prisma,
        configStub(),
        visibility,
      );

      const first = await service.redeemInvite('user-1', { code: 'ABC123' });
      expect(first.status).toBe('MEMBER');

      await expect(
        service.redeemInvite('user-2', { code: 'ABC123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects expired invite with 400', async () => {
      const prisma: any = {
        communityInvite: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'inv-1',
            communityId: 'comm-1',
            code: 'OLD',
            maxUses: 1,
            useCount: 0,
            expiresAt: new Date(Date.now() - 1000),
          }),
        },
      };
      const visibility = new CommunityVisibilityService(prisma);
      const service = new CommunitiesService(
        prisma,
        configStub(),
        visibility,
      );
      await expect(
        service.redeemInvite('user-1', { code: 'OLD' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('estate-manager scope', () => {
    it('throws Forbidden when manager touches another community', async () => {
      const { AdminPortalService } = await import(
        '../admin/admin-portal.service'
      );
      const prisma: any = {
        communityManager: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        communityMembership: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'mem-1',
            communityId: 'other-comm',
            userId: 'u1',
            status: 'INVITED',
          }),
        },
      };
      const portal = new AdminPortalService(
        prisma,
        {} as never,
        { log: jest.fn() } as never,
        { notify: jest.fn() } as never,
        {} as never,
        {} as never,
      );
      await expect(
        portal.assertCanManageCommunity(
          { id: 'mgr-1', roles: ['CONTENT_MODERATOR'] },
          'other-comm',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows OPERATIONS unrestricted', async () => {
      const { AdminPortalService } = await import(
        '../admin/admin-portal.service'
      );
      const prisma: any = {
        communityManager: { findUnique: jest.fn() },
      };
      const portal = new AdminPortalService(
        prisma,
        {} as never,
        { log: jest.fn() } as never,
        { notify: jest.fn() } as never,
        {} as never,
        {} as never,
      );
      await expect(
        portal.assertCanManageCommunity(
          { id: 'ops-1', roles: ['OPERATIONS'] },
          'any-comm',
        ),
      ).resolves.toBeUndefined();
      expect(prisma.communityManager.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('404-leak private listing', () => {
    it('getById private listing as non-member throws NotFoundException', async () => {
      const listing = {
        id: 'listing-1',
        sellerId: 'seller-1',
        status: 'LIVE',
        communityId: 'comm-private',
        communityOnly: false,
        estateCommunity: { privacy: 'PRIVATE' as const },
        title: 'Secret sofa',
        description: '',
        brand: null,
        model: null,
        condition: 'GOOD',
        priceKobo: 100,
        negotiable: true,
        sellingMode: 'SELL',
        community: 'VGC',
        geoLat: null,
        geoLng: null,
        fulfilmentPickup: true,
        fulfilmentMeet: true,
        fulfilmentDelivery: false,
        createdAt: new Date(),
        publishedAt: new Date(),
        vehicle: null,
        images: [],
        seller: { profile: { displayName: 'S' }, verifications: [] },
        category: null,
        movingSale: null,
      };

      const prisma: any = {
        listing: {
          findUnique: jest.fn().mockResolvedValue(listing),
          update: jest.fn(),
        },
        listingEvent: { create: jest.fn() },
        communityMembership: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        community: {
          findUnique: jest.fn().mockResolvedValue({ privacy: 'PRIVATE' }),
        },
      };

      const visibility = new CommunityVisibilityService(prisma);
      // Minimal ListingsService deps — only exercise getById visibility path
      const service = Object.create(ListingsService.prototype) as ListingsService;
      (service as any).prisma = prisma;
      (service as any).visibility = visibility;

      await expect(service.getById('listing-1', 'stranger')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.getById('listing-1', 'stranger')).rejects.not.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
