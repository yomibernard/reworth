import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GiveawayClaimsService } from './giveaway-claims.service';
import { SwapProposalsService } from './swap-proposals.service';

@Injectable()
export class SwapExpiryScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SwapExpiryScheduler.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly proposals: SwapProposalsService,
    private readonly claims: GiveawayClaimsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const disabled =
      process.env.NODE_ENV === 'test' ||
      this.config.get<string>('SWAP_EXPIRY_SCHEDULER') === 'false';
    if (disabled) return;

    const intervalMs = 5 * 60 * 1000;
    this.timer = setInterval(() => {
      void this.expireAll().catch((err) =>
        this.logger.warn(`Swap expiry failed: ${(err as Error).message}`),
      );
    }, intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async expireAll(now = new Date()): Promise<{
    proposals: number;
    claims: number;
  }> {
    const proposals = await this.proposals.expireDueProposals(now);
    const claims = await this.claims.expireDueClaims(now);
    if (proposals + claims > 0) {
      this.logger.log(
        `Expired ${proposals} swap proposal(s), ${claims} giveaway claim(s)`,
      );
    }
    return { proposals, claims };
  }
}
