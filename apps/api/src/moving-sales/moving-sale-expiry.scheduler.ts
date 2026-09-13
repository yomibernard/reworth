import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MovingSalesService } from './moving-sales.service';

@Injectable()
export class MovingSaleExpiryScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MovingSaleExpiryScheduler.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly movingSales: MovingSalesService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const disabled =
      process.env.NODE_ENV === 'test' ||
      this.config.get<string>('MOVING_SALE_EXPIRY_SCHEDULER') === 'false';
    if (disabled) return;

    const intervalMs = 5 * 60 * 1000;
    this.timer = setInterval(() => {
      void this.expireAll().catch((err) =>
        this.logger.warn(
          `Moving sale expiry failed: ${(err as Error).message}`,
        ),
      );
    }, intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async expireAll(now = new Date()): Promise<number> {
    const count = await this.movingSales.expireDueSales(now);
    if (count > 0) {
      this.logger.log(`Marked ${count} moving sale(s) COMPLETED`);
    }
    return count;
  }
}
