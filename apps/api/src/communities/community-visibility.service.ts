import { Injectable } from '@nestjs/common';
import {
  CommunityMembershipStatus,
  CommunityPrivacy,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ListingVisibilityFields = {
  sellerId: string;
  communityId: string | null;
  communityOnly: boolean;
  estateCommunity?: { privacy: CommunityPrivacy } | null;
};

const ACTIVE_MEMBER_STATUSES: CommunityMembershipStatus[] = [
  'MEMBER',
  'APPROVED',
];

@Injectable()
export class CommunityVisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  /** MEMBER preferred; APPROVED also counts for gating. */
  async isActiveMember(
    userId: string,
    communityId: string,
  ): Promise<boolean> {
    const row = await this.prisma.communityMembership.findUnique({
      where: {
        communityId_userId: { communityId, userId },
      },
      select: { status: true },
    });
    return Boolean(
      row && ACTIVE_MEMBER_STATUSES.includes(row.status),
    );
  }

  /**
   * Visibility rules:
   * - no communityId → public
   * - privacy PUBLIC → always
   * - SEMI_PRIVATE → always viewable (badge later)
   * - PRIVATE or communityOnly=true → members only; seller always
   */
  async canViewListing(
    listing: ListingVisibilityFields,
    viewerId?: string | null,
  ): Promise<boolean> {
    if (!listing.communityId) return true;
    if (viewerId && listing.sellerId === viewerId) return true;

    let privacy = listing.estateCommunity?.privacy;
    if (!privacy) {
      const community = await this.prisma.community.findUnique({
        where: { id: listing.communityId },
        select: { privacy: true },
      });
      if (!community) return false;
      privacy = community.privacy;
    }

    if (
      privacy === CommunityPrivacy.PUBLIC ||
      privacy === CommunityPrivacy.SEMI_PRIVATE
    ) {
      if (!listing.communityOnly) return true;
    }

    // PRIVATE or communityOnly → members only
    if (!viewerId) return false;
    return this.isActiveMember(viewerId, listing.communityId);
  }

  /**
   * Prisma where fragment: exclude private / communityOnly listings
   * the viewer cannot see. Seller always sees own listings.
   */
  visibleListingWhere(
    viewerId?: string | null,
  ): Prisma.ListingWhereInput {
    const publicOrSemi: Prisma.ListingWhereInput = {
      AND: [
        { communityOnly: false },
        {
          OR: [
            { communityId: null },
            {
              estateCommunity: {
                privacy: {
                  in: [CommunityPrivacy.PUBLIC, CommunityPrivacy.SEMI_PRIVATE],
                },
              },
            },
          ],
        },
      ],
    };

    if (!viewerId) {
      return publicOrSemi;
    }

    return {
      OR: [
        publicOrSemi,
        { sellerId: viewerId },
        {
          estateCommunity: {
            memberships: {
              some: {
                userId: viewerId,
                status: { in: ACTIVE_MEMBER_STATUSES },
              },
            },
          },
        },
      ],
    };
  }
}
