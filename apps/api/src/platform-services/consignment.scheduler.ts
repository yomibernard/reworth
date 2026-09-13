import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsignmentService } from './consignment.service';

@Injectable()
export class ConsignmentExpiryScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ConsignmentExpiryScheduler.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly consignments: ConsignmentService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const disabled =
      process.env.NODE_ENV === 'test' ||
      this.config.get<string>('CONSIGNMENT_EXPIRY_SCHEDULER') === 'false';
    if (disabled) return;

    const intervalMs = 60 * 60 * 1000;
    this.timer = setInterval(() => {
      void this.consignments.expireUnsold().catch((err) =>
        this.logger.warn(`Consignment expiry failed: ${(err as Error).message}`),
      );
    }, intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
