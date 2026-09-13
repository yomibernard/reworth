import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DisputesService } from './disputes.service';

@Injectable()
export class DisputeSellerExpiryScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DisputeSellerExpiryScheduler.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly disputes: DisputesService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const disabled =
      process.env.NODE_ENV === 'test' ||
      this.config.get<string>('DISPUTE_SELLER_EXPIRY_SCHEDULER') === 'false';
    if (disabled) return;

    const intervalMs = 5 * 60 * 1000;
    this.timer = setInterval(() => {
      void this.disputes.expireSellerResponses().catch((err) =>
        this.logger.warn(
          `Dispute seller expiry failed: ${(err as Error).message}`,
        ),
      );
    }, intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
