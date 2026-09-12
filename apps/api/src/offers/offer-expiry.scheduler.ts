import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OffersService } from './offers.service';

@Injectable()
export class OfferExpiryScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OfferExpiryScheduler.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly offers: OffersService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const disabled =
      process.env.NODE_ENV === 'test' ||
      this.config.get<string>('OFFER_EXPIRY_SCHEDULER') === 'false';
    if (disabled) return;

    const intervalMs = 5 * 60 * 1000;
    this.timer = setInterval(() => {
      void this.offers.expireDueOffers().catch((err) =>
        this.logger.warn(`Offer expiry failed: ${(err as Error).message}`),
      );
    }, intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
