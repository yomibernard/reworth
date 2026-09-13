import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CircularService } from './circular.service';

@Injectable()
export class CircularDonateScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CircularDonateScheduler.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly circular: CircularService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const disabled =
      process.env.NODE_ENV === 'test' ||
      this.config.get<string>('CIRCULAR_DONATE_SCHEDULER') === 'false';
    if (disabled) return;

    const hourMs = 60 * 60 * 1000;
    this.timer = setInterval(() => {
      void this.circular.processDonateIfUnsold().catch((err) =>
        this.logger.warn(
          `Donate-if-unsold job failed: ${(err as Error).message}`,
        ),
      );
    }, hourMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
