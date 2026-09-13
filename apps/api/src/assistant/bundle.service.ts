import { Injectable, NotFoundException } from '@nestjs/common';
import { normalizeCity } from '../intelligence/city-scope';
import { AnalyticsService } from '../listings/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { pickBudgetBundle } from './mock-assistant.provider';

@Injectable()
export class BundleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async create(
    userId: string,
    input: {
      brief: string;
      budgetKobo: number;
      city?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    const city = normalizeCity(input.city);
    const listings = await this.prisma.listing.findMany({
      where: { status: 'LIVE', city },
      select: {
        id: true,
        title: true,
        priceKobo: true,
        city: true,
        categoryId: true,
        geoLat: true,
        geoLng: true,
        category: { select: { slug: true } },
      },
      take: 200,
    });

    const catalog = listings.map((l) => ({
      id: l.id,
      title: l.title,
      priceKobo: l.priceKobo,
      city: l.city,
      categoryId: l.categoryId,
      categorySlug: l.category?.slug ?? null,
      geoLat: l.geoLat,
      geoLng: l.geoLng,
    }));

    const picked = pickBudgetBundle(
      catalog,
      input.budgetKobo,
      input.lat,
      input.lng,
    );
    const totalKobo = picked.reduce((s, p) => s + p.priceKobo, 0);

    const row = await this.prisma.savedBundle.create({
      data: {
        userId,
        city,
        brief: input.brief,
        budgetKobo: input.budgetKobo,
        listingIds: picked.map((p) => p.id),
        totalKobo,
      },
    });

    this.analytics.log('assistant_bundle_created', {
      bundleId: row.id,
      userId,
      city,
      budgetKobo: input.budgetKobo,
      totalKobo,
      count: picked.length,
    });

    return {
      id: row.id,
      shareToken: row.shareToken,
      brief: row.brief,
      budgetKobo: row.budgetKobo,
      totalKobo: row.totalKobo,
      city: row.city,
      listingIds: row.listingIds,
      listings: picked,
      createdAt: row.createdAt,
    };
  }

  async getByShareToken(shareToken: string) {
    const row = await this.prisma.savedBundle.findUnique({
      where: { shareToken },
    });
    if (!row) throw new NotFoundException('Bundle not found');

    const listings = await this.prisma.listing.findMany({
      where: { id: { in: row.listingIds } },
      select: {
        id: true,
        title: true,
        priceKobo: true,
        city: true,
        status: true,
      },
    });

    return {
      id: row.id,
      shareToken: row.shareToken,
      brief: row.brief,
      budgetKobo: row.budgetKobo,
      totalKobo: row.totalKobo,
      city: row.city,
      listingIds: row.listingIds,
      listings,
      createdAt: row.createdAt,
    };
  }

  async save(userId: string, bundleId: string) {
    const row = await this.prisma.savedBundle.findUnique({
      where: { id: bundleId },
    });
    if (!row) throw new NotFoundException('Bundle not found');
    if (row.userId !== userId) {
      const copy = await this.prisma.savedBundle.create({
        data: {
          userId,
          city: row.city,
          brief: row.brief,
          budgetKobo: row.budgetKobo,
          listingIds: row.listingIds,
          totalKobo: row.totalKobo,
        },
      });
      this.analytics.log('assistant_bundle_saved', {
        bundleId: copy.id,
        fromId: bundleId,
        userId,
      });
      return copy;
    }
    this.analytics.log('assistant_bundle_saved', { bundleId, userId });
    return row;
  }

  /** Pure helper for property tests — never exceeds budget; city-scoped. */
  buildWithinBudget(
    catalog: Array<{
      id: string;
      title: string;
      priceKobo: number;
      city: string;
      categoryId: string | null;
      categorySlug?: string | null;
      geoLat?: number | null;
      geoLng?: number | null;
    }>,
    budgetKobo: number,
    city: string,
    lat?: number,
    lng?: number,
  ) {
    const scoped = catalog.filter(
      (l) => l.city.toLowerCase() === city.toLowerCase(),
    );
    const picked = pickBudgetBundle(scoped, budgetKobo, lat, lng);
    const totalKobo = picked.reduce((s, p) => s + p.priceKobo, 0);
    return { picked, totalKobo, city };
  }
}
