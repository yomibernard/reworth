import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeCity, DEFAULT_CITY } from './city-scope';

export type SellerListingAnalytics = {
  listingId: string;
  title: string;
  status: string;
  city: string;
  priceKobo: number;
  views: number;
  saves: number;
  offers: number;
  offerToSaleConversion: number | null;
  medianTimeToSaleHours: number | null;
  priceCompetitiveness: number | null;
  sold: boolean;
};

export type SellerAnalyticsResponse = {
  sellerId: string;
  city: string;
  aggregate: {
    views: number;
    saves: number;
    offers: number;
    offerToSaleConversion: number | null;
    medianTimeToSaleHours: number | null;
    responseMinutes: number | null;
    revenue30dKobo: number;
    revenue90dKobo: number;
  };
  listings: SellerListingAnalytics[];
  bestPerformers: SellerListingAnalytics[];
  worstPerformers: SellerListingAnalytics[];
};

@Injectable()
export class SellerAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForSeller(
    sellerId: string,
    city?: string,
  ): Promise<SellerAnalyticsResponse> {
    const cityFilter = city ? normalizeCity(city) : null;

    const listings = await this.prisma.listing.findMany({
      where: {
        sellerId,
        ...(cityFilter ? { city: cityFilter } : {}),
      },
      include: {
        events: {
          where: { type: { in: ['VIEWED', 'SAVED'] } },
          select: { type: true },
        },
        offers: { select: { id: true } },
        orders: {
          where: { status: 'COMPLETED' },
          select: {
            amountKobo: true,
            completedAt: true,
            createdAt: true,
          },
        },
      },
      take: 200,
    });

    const trust = await this.prisma.trustScore.findUnique({
      where: { userId: sellerId },
    });

    const now = Date.now();
    const d30 = now - 30 * 86_400_000;
    const d90 = now - 90 * 86_400_000;

    // Market mid per category for competitiveness
    const categoryIds = [
      ...new Set(listings.map((l) => l.categoryId).filter(Boolean)),
    ] as string[];
    const marketMids = new Map<string, number>();
    for (const catId of categoryIds) {
      const peers = await this.prisma.listing.findMany({
        where: {
          status: 'LIVE',
          categoryId: catId,
          ...(cityFilter ? { city: cityFilter } : {}),
        },
        select: { priceKobo: true },
        take: 100,
      });
      const prices = peers
        .map((p) => p.priceKobo)
        .filter((p) => p > 0)
        .sort((a, b) => a - b);
      if (prices.length) {
        marketMids.set(catId, prices[Math.floor(prices.length / 2)]!);
      }
    }

    const perListing: SellerListingAnalytics[] = listings.map((l) => {
      const views =
        l.views || l.events.filter((e) => e.type === 'VIEWED').length;
      const saves = l.events.filter((e) => e.type === 'SAVED').length;
      const offers = l.offers.length;
      const soldOrders = l.orders;
      const sold = soldOrders.length > 0;
      const offerToSaleConversion =
        offers > 0 ? soldOrders.length / offers : null;

      const times = soldOrders
        .map((o) => {
          const end = o.completedAt ?? o.createdAt;
          return (end.getTime() - l.createdAt.getTime()) / 3_600_000;
        })
        .filter((h) => h >= 0)
        .sort((a, b) => a - b);
      const medianTimeToSaleHours = times.length
        ? times[Math.floor(times.length / 2)]!
        : null;

      const mid = l.categoryId ? marketMids.get(l.categoryId) : undefined;
      const priceCompetitiveness =
        mid && mid > 0 ? l.priceKobo / mid : null;

      return {
        listingId: l.id,
        title: l.title,
        status: l.status,
        city: l.city || DEFAULT_CITY,
        priceKobo: l.priceKobo,
        views,
        saves,
        offers,
        offerToSaleConversion,
        medianTimeToSaleHours,
        priceCompetitiveness,
        sold,
      };
    });

    const revenue30dKobo = listings.reduce((sum, l) => {
      return (
        sum +
        l.orders
          .filter((o) => (o.completedAt ?? o.createdAt).getTime() >= d30)
          .reduce((s, o) => s + o.amountKobo, 0)
      );
    }, 0);

    const revenue90dKobo = listings.reduce((sum, l) => {
      return (
        sum +
        l.orders
          .filter((o) => (o.completedAt ?? o.createdAt).getTime() >= d90)
          .reduce((s, o) => s + o.amountKobo, 0)
      );
    }, 0);

    const totalViews = perListing.reduce((s, l) => s + l.views, 0);
    const totalSaves = perListing.reduce((s, l) => s + l.saves, 0);
    const totalOffers = perListing.reduce((s, l) => s + l.offers, 0);
    const totalSold = perListing.filter((l) => l.sold).length;
    const offerToSaleConversion =
      totalOffers > 0 ? totalSold / totalOffers : null;

    const saleHours = perListing
      .map((l) => l.medianTimeToSaleHours)
      .filter((h): h is number => h != null)
      .sort((a, b) => a - b);
    const medianTimeToSaleHours = saleHours.length
      ? saleHours[Math.floor(saleHours.length / 2)]!
      : null;

    const scored = [...perListing].sort((a, b) => {
      const sa = a.views + a.saves * 3 + a.offers * 5 + (a.sold ? 20 : 0);
      const sb = b.views + b.saves * 3 + b.offers * 5 + (b.sold ? 20 : 0);
      return sb - sa;
    });

    const response: SellerAnalyticsResponse = {
      sellerId,
      city: cityFilter ?? DEFAULT_CITY,
      aggregate: {
        views: totalViews,
        saves: totalSaves,
        offers: totalOffers,
        offerToSaleConversion,
        medianTimeToSaleHours,
        responseMinutes:
          trust?.medianResponseMinutes != null
            ? Math.round(trust.medianResponseMinutes)
            : null,
        revenue30dKobo,
        revenue90dKobo,
      },
      listings: perListing,
      bestPerformers: scored.slice(0, 3),
      worstPerformers: scored.slice(-3).reverse(),
    };

    // Hard privacy — never include buyer identity fields
    return JSON.parse(
      JSON.stringify(response, (key, value) => {
        if (
          key === 'buyerId' ||
          key === 'email' ||
          key === 'phone' ||
          key === 'buyer'
        ) {
          return undefined;
        }
        return value;
      }),
    ) as SellerAnalyticsResponse;
  }

  async exportCsv(sellerId: string, city?: string): Promise<string> {
    const data = await this.getForSeller(sellerId, city);
    const header =
      'listingId,title,status,city,priceKobo,views,saves,offers,offerToSaleConversion,medianTimeToSaleHours,priceCompetitiveness,sold';
    const lines = data.listings.map((l) =>
      [
        l.listingId,
        csvEscape(l.title),
        l.status,
        l.city,
        l.priceKobo,
        l.views,
        l.saves,
        l.offers,
        l.offerToSaleConversion ?? '',
        l.medianTimeToSaleHours ?? '',
        l.priceCompetitiveness ?? '',
        l.sold,
      ].join(','),
    );
    const agg = [
      '',
      `aggregate_views,${data.aggregate.views}`,
      `aggregate_saves,${data.aggregate.saves}`,
      `aggregate_offers,${data.aggregate.offers}`,
      `revenue30dKobo,${data.aggregate.revenue30dKobo}`,
      `revenue90dKobo,${data.aggregate.revenue90dKobo}`,
    ];
    return [header, ...lines, ...agg].join('\n');
  }
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
