import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ListingStateMachine } from './listing-state.machine';

@Injectable()
export class ListingExpiryScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ListingExpiryScheduler.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    // Phase 2 simplicity: hourly setInterval (BullMQ repeatable optional later)
    const disabled =
      process.env.NODE_ENV === 'test' ||
      this.config.get<string>('LISTING_EXPIRY_SCHEDULER') === 'false';
    if (disabled) return;

    const hourMs = 60 * 60 * 1000;
    this.timer = setInterval(() => {
      void this.expireDueListings().catch((err) =>
        this.logger.warn(`Expiry job failed: ${(err as Error).message}`),
      );
    }, hourMs);
    // Unref so it doesn't keep process alive in some runtimes
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async expireDueListings(now = new Date()): Promise<number> {
    const due = await this.prisma.listing.findMany({
      where: {
        status: 'LIVE',
        expiresAt: { lte: now },
      },
      select: { id: true, status: true },
    });

    let count = 0;
    for (const row of due) {
      ListingStateMachine.assertTransition(row.status, 'EXPIRED');
      await this.prisma.listing.update({
        where: { id: row.id },
        data: { status: 'EXPIRED' },
      });
      await this.prisma.listingEvent.create({
        data: {
          listingId: row.id,
          type: 'STATUS_CHANGED',
          payload: { from: 'LIVE', to: 'EXPIRED', reason: 'expiry' },
        },
      });
      count++;
    }
    if (count > 0) {
      this.logger.log(`Expired ${count} listing(s)`);
    }
    return count;
  }
}
