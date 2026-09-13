import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TrustScoreService } from './trust-score.service';

@Injectable()
export class TrustScoreCron implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrustScoreCron.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly trust: TrustScoreService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const disabled =
      process.env.NODE_ENV === 'test' ||
      this.config.get<string>('TRUST_SCORE_CRON') === 'false';
    if (disabled) return;

    // Daily-ish: every 24h (also recompute on order COMPLETED)
    const intervalMs = 24 * 60 * 60 * 1000;
    this.timer = setInterval(() => {
      void this.trust.recomputeMany('daily_cron').then(
        (n) => this.logger.log(`Trust cron recomputed ${n} user(s)`),
        (err) =>
          this.logger.warn(`Trust cron failed: ${(err as Error).message}`),
      );
    }, intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
