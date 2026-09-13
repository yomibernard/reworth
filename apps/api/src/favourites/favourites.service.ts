import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DiscoveryAnalyticsService } from '../discovery/discovery-analytics.service';
import { toPublicListing } from '../listings/public-listing.mapper';
import type {
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
} from './dto/favourites.dto';

const listingInclude = {
  category: true,
  subcategory: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  seller: {
    include: {
      profile: true,
      verifications: true,
    },
  },
} satisfies Prisma.ListingInclude;

@Injectable()
export class FavouritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: DiscoveryAnalyticsService,
  ) {}

  async favourite(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing || listing.status === 'REMOVED') {
      throw new NotFoundException('Listing not found');
    }

    const fav = await this.prisma.favourite.upsert({
      where: {
        userId_listingId: { userId, listingId },
      },
      create: { userId, listingId },
      update: {},
    });

    await this.prisma.listingEvent.create({
      data: {
        listingId,
        type: 'SAVED',
        actorUserId: userId,
        payload: { favouriteId: fav.id },
      },
    });

    this.analytics.listingSaved({ userId, listingId });
    return { ok: true, favouriteId: fav.id };
  }

  async unfavourite(userId: string, listingId: string) {
    await this.prisma.favourite.deleteMany({
      where: { userId, listingId },
    });
    return { ok: true };
  }

  async follow(followerId: string, sellerId: string) {
    if (followerId === sellerId) {
      throw new BadRequestException('Cannot follow yourself');
    }
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: { profile: true },
    });
    if (!seller || seller.status === 'DELETED') {
      throw new NotFoundException('Seller not found');
    }

    const follow = await this.prisma.sellerFollow.upsert({
      where: {
        followerId_sellerId: { followerId, sellerId },
      },
      create: { followerId, sellerId },
      update: {},
    });

    this.analytics.sellerFollowed({ followerId, sellerId });
    return { ok: true, followId: follow.id };
  }

  async unfollow(followerId: string, sellerId: string) {
    await this.prisma.sellerFollow.deleteMany({
      where: { followerId, sellerId },
    });
    return { ok: true };
  }

  async getMeFavourites(userId: string) {
    const [favourites, follows, searches] = await Promise.all([
      this.prisma.favourite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { listing: { include: listingInclude } },
      }),
      this.prisma.sellerFollow.findMany({
        where: { followerId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          seller: {
            include: {
              profile: true,
              verifications: true,
            },
          },
        },
      }),
      this.prisma.savedSearch.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      items: favourites
        .filter((f) => f.listing.status === 'LIVE' || f.listing.status === 'RESERVED')
        .map((f) => ({
          favouriteId: f.id,
          savedAt: f.createdAt,
          listing: toPublicListing(f.listing),
        })),
      sellers: follows.map((f) => ({
        followId: f.id,
        followedAt: f.createdAt,
        seller: {
          id: f.seller.id,
          displayName: f.seller.profile?.displayName ?? 'Seller',
          verificationBadge: Boolean(
            f.seller.verifications?.some(
              (v) => v.level === 'L3_IDENTITY' && v.status === 'VERIFIED',
            ),
          ),
        },
      })),
      searches: searches.map((s) => ({
        id: s.id,
        name: s.name,
        filters: s.filters,
        newMatchesCount: s.newMatchesCount,
        lastCheckedAt: s.lastCheckedAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };
  }

  async createSavedSearch(userId: string, dto: CreateSavedSearchDto) {
    return this.prisma.savedSearch.create({
      data: {
        userId,
        name: dto.name,
        filters: dto.filters as Prisma.InputJsonValue,
      },
    });
  }

  async listSavedSearches(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateSavedSearch(
    userId: string,
    id: string,
    dto: UpdateSavedSearchDto,
  ) {
    await this.requireSavedSearchOwner(userId, id);
    return this.prisma.savedSearch.update({
      where: { id },
      data: {
        ...(dto.name != null ? { name: dto.name } : {}),
        ...(dto.filters != null
          ? { filters: dto.filters as Prisma.InputJsonValue }
          : {}),
        ...(dto.newMatchesCount != null
          ? { newMatchesCount: dto.newMatchesCount }
          : {}),
      },
    });
  }

  async deleteSavedSearch(userId: string, id: string) {
    await this.requireSavedSearchOwner(userId, id);
    await this.prisma.savedSearch.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Lightweight hook: when a listing goes LIVE, bump newMatchesCount
   * for saved searches whose filters roughly match.
   */
  async onListingLive(listing: {
    id: string;
    title: string;
    description: string;
    categoryId: string | null;
    subcategoryId: string | null;
    priceKobo: number;
    condition: string;
    community: string;
    fulfilmentDelivery: boolean;
  }): Promise<void> {
    const searches = await this.prisma.savedSearch.findMany({ take: 500 });
    for (const s of searches) {
      const filters = (s.filters ?? {}) as Record<string, unknown>;
      if (!this.matchesSavedFilters(listing, filters)) continue;
      await this.prisma.savedSearch.update({
        where: { id: s.id },
        data: {
          newMatchesCount: { increment: 1 },
          lastCheckedAt: new Date(),
        },
      });
    }
  }

  private matchesSavedFilters(
    listing: {
      title: string;
      description: string;
      categoryId: string | null;
      subcategoryId: string | null;
      priceKobo: number;
      condition: string;
      community: string;
      fulfilmentDelivery: boolean;
    },
    filters: Record<string, unknown>,
  ): boolean {
    if (
      typeof filters.categoryId === 'string' &&
      filters.categoryId &&
      listing.categoryId !== filters.categoryId
    ) {
      return false;
    }
    if (
      typeof filters.subcategoryId === 'string' &&
      filters.subcategoryId &&
      listing.subcategoryId !== filters.subcategoryId
    ) {
      return false;
    }
    if (
      typeof filters.community === 'string' &&
      filters.community &&
      listing.community !== filters.community
    ) {
      return false;
    }
    if (
      typeof filters.condition === 'string' &&
      filters.condition &&
      listing.condition !== filters.condition
    ) {
      return false;
    }
    if (
      typeof filters.priceMaxKobo === 'number' &&
      listing.priceKobo > filters.priceMaxKobo
    ) {
      return false;
    }
    if (
      typeof filters.priceMinKobo === 'number' &&
      listing.priceKobo < filters.priceMinKobo
    ) {
      return false;
    }
    if (filters.deliveryAvailable === true && !listing.fulfilmentDelivery) {
      return false;
    }
    if (typeof filters.q === 'string' && filters.q.trim()) {
      const hay = `${listing.title} ${listing.description}`.toLowerCase();
      const q = filters.q.trim().toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  private async requireSavedSearchOwner(userId: string, id: string) {
    const row = await this.prisma.savedSearch.findUnique({ where: { id } });
    if (!row || row.userId !== userId) {
      throw new NotFoundException('Saved search not found');
    }
    return row;
  }
}
