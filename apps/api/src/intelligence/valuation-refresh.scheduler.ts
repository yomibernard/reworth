import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_CITY, normalizeCity } from './city-scope';
import { meanAbsoluteErrorKobo, percentile } from './valuation.provider';

@Injectable()
export class ValuationRefreshScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ValuationRefreshScheduler.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const disabled =
      process.env.NODE_ENV === 'test' ||
      this.config.get<string>('VALUATION_REFRESH_SCHEDULER') === 'false';
    if (disabled) return;

    // Weekly
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    this.timer = setInterval(() => {
      void this.refresh().catch((err) =>
        this.logger.warn(
          `Valuation refresh failed: ${(err as Error).message}`,
        ),
      );
    }, weekMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Write ValuationModelReport(s): coverage by category+city and MAE on
   * held-out completed orders vs simple median prediction.
   */
  async refresh(city = DEFAULT_CITY): Promise<number> {
    const c = normalizeCity(city);
    const completed = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        listing: { city: c },
      },
      include: {
        listing: { select: { categoryId: true, priceKobo: true } },
      },
      take: 500,
      orderBy: { completedAt: 'desc' },
    });

    const byCategory = new Map<string | null, typeof completed>();
    for (const o of completed) {
      const key = o.listing.categoryId;
      const list = byCategory.get(key) ?? [];
      list.push(o);
      byCategory.set(key, list);
    }

    let written = 0;
    const liveTotal = await this.prisma.listing.count({
      where: { status: 'LIVE', city: c },
    });

    for (const [categoryId, orders] of byCategory) {
      if (orders.length < 2) continue;

      // Hold out last 20% as synthetic eval set
      const holdoutN = Math.max(1, Math.floor(orders.length * 0.2));
      const train = orders.slice(holdoutN);
      const holdout = orders.slice(0, holdoutN);
      const trainPrices = train
        .map((o) => o.amountKobo)
        .filter((p) => p > 0)
        .sort((a, b) => a - b);
      const pred = percentile(trainPrices, 50);
      const actuals = holdout.map((o) => o.amountKobo);
      const predictions = actuals.map(() => pred);
      const mae = meanAbsoluteErrorKobo(actuals, predictions);

      const liveInCat = await this.prisma.listing.count({
        where: {
          status: 'LIVE',
          city: c,
          ...(categoryId ? { categoryId } : {}),
        },
      });
      const coveragePct =
        liveTotal > 0 ? (liveInCat / liveTotal) * 100 : 0;

      await this.prisma.valuationModelReport.create({
        data: {
          id: randomUUID(),
          city: c,
          categoryId,
          sampleCount: orders.length,
          maeKobo: mae,
          coveragePct,
          notes: `held_out=${holdoutN}; train_median=${pred}`,
        },
      });
      written += 1;
    }

    if (written > 0) {
      this.logger.log(`Valuation reports written: ${written} (${c})`);
    }
    return written;
  }
}
