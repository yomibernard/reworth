import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InstantBuyService } from './instant-buy.service';

@Injectable()
export class InstantBuySlaScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InstantBuySlaScheduler.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly instantBuy: InstantBuyService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const disabled =
      process.env.NODE_ENV === 'test' ||
      this.config.get<string>('INSTANT_BUY_SLA_SCHEDULER') === 'false';
    if (disabled) return;

    const intervalMs = 5 * 60 * 1000;
    this.timer = setInterval(() => {
      void this.instantBuy.processSlaBreaches().catch((err) =>
        this.logger.warn(`SLA sweep failed: ${(err as Error).message}`),
      );
    }, intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
