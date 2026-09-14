import { Injectable } from '@nestjs/common';
import { RevenueStream } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);
    const lines = await this.prisma.revenueLine.findMany({
      where: {
        createdAt: { gte: since },
        status: { in: ['SETTLED', 'PENDING'] },
      },
    });

    const byStream: Record<string, { grossKobo: number; netKobo: number; count: number }> =
      {};
    const byCity: Record<string, { netKobo: number; count: number }> = {};
    let netTotal = 0;
    let grossTotal = 0;

    for (const l of lines) {
      if (l.status === 'REFUNDED') continue;
      const s = (byStream[l.stream] ??= { grossKobo: 0, netKobo: 0, count: 0 });
      s.grossKobo += l.grossKobo;
      s.netKobo += l.netKobo;
      s.count += 1;
      const c = (byCity[l.city] ??= { netKobo: 0, count: 0 });
      c.netKobo += l.netKobo;
      c.count += 1;
      netTotal += l.netKobo;
      grossTotal += l.grossKobo;
    }

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: since },
        status: 'COMPLETED',
      },
      select: { totalKobo: true, amountKobo: true },
    });
    const gmvKobo = orders.reduce((a, o) => a + o.amountKobo, 0);
    const takeRate = gmvKobo > 0 ? netTotal / gmvKobo : 0;

    const liveListings = await this.prisma.listing.count({
      where: { status: 'LIVE' },
    });
    const now = new Date();
    const boosted = await this.prisma.promotion.groupBy({
      by: ['listingId'],
      where: {
        kind: 'BOOST',
        startsAt: { lte: now },
        endsAt: { gt: now },
        paymentStatus: 'SUCCESS',
      },
    });
    const boostAttachRate =
      liveListings > 0 ? boosted.length / liveListings : 0;

    const activeSubs = await this.prisma.sellerSubscription.count({
      where: { status: 'ACTIVE', tier: 'PLUS' },
    });
    const plusPrice =
      (
        await this.prisma.sellerSubscription.findFirst({
          where: { status: 'ACTIVE', tier: 'PLUS' },
          select: { priceKobo: true },
        })
      )?.priceKobo ?? 499_900;
    const mrrKobo = activeSubs * plusPrice;

    const cancelled30 = await this.prisma.sellerSubscription.count({
      where: {
        status: 'CANCELLED',
        updatedAt: { gte: since },
      },
    });
    const newPlus30 = await this.prisma.sellerSubscription.count({
      where: {
        status: 'ACTIVE',
        tier: 'PLUS',
        createdAt: { gte: since },
      },
    });

    return {
      windowDays: days,
      since: since.toISOString(),
      byStream,
      byCity,
      grossTotalKobo: grossTotal,
      netTotalKobo: netTotal,
      gmvKobo,
      takeRate,
      boostAttachRate,
      liveListings,
      boostedListings: boosted.length,
      mrr: {
        activeKobo: mrrKobo,
        activeSubs,
        netNew: newPlus30 - cancelled30,
        churn: cancelled30,
      },
      streams: [
        'PROTECTION_FEE',
        'DELIVERY_MARGIN',
        'BOOST',
        'FEATURED',
        'PROMOTED',
        'SUBSCRIPTION',
        'INSPECTION_FEE',
        'AUTHENTICATION_FEE',
        'CONSIGNMENT_FEE',
        'OTHER',
      ] as RevenueStream[],
    };
  }
}
