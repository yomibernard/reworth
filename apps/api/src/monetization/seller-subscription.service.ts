import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../providers/payment.provider';
import { MockPsp } from '../providers/mock-psp';
import { FeeConfigService } from './fee-config.service';
import { RevenueLedgerService } from './revenue-ledger.service';

@Injectable()
export class SellerSubscriptionService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SellerSubscriptionService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fees: FeeConfigService,
    private readonly ledger: RevenueLedgerService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly psp: PaymentProvider,
  ) {}

  onModuleInit() {
    if (
      process.env.NODE_ENV === 'test' ||
      this.config.get('SELLER_SUB_SCHEDULER') === 'false'
    ) {
      return;
    }
    this.timer = setInterval(() => {
      void this.tick().catch((e) =>
        this.logger.warn(`seller sub tick: ${(e as Error).message}`),
      );
    }, 60 * 60 * 1000);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async getOrCreate(userId: string) {
    const existing = await this.prisma.sellerSubscription.findUnique({
      where: { userId },
    });
    if (existing) return existing;
    return this.prisma.sellerSubscription.create({
      data: { userId, tier: 'STARTER', status: 'NONE', priceKobo: 0 },
    });
  }

  async benefits(userId: string) {
    const sub = await this.getOrCreate(userId);
    const { rates } = await this.fees.getActive();
    const active =
      sub.status === 'ACTIVE' ||
      (sub.status === 'PAST_DUE' &&
        sub.graceUntil &&
        sub.graceUntil.getTime() > Date.now());
    const plus = active && sub.tier === 'PLUS';
    return {
      subscription: sub,
      maxActiveListings: plus
        ? rates.sellerPlus.maxActiveListings
        : rates.sellerStarter.maxActiveListings,
      featuredSlotsPerMonth: plus ? rates.sellerPlus.featuredSlotsPerMonth : 0,
      analytics: plus,
      prioritySupport: plus,
      tier: plus ? 'PLUS' : 'STARTER',
    };
  }

  async upgradeToPlus(userId: string, idempotencyKey: string) {
    const sub = await this.getOrCreate(userId);
    if (sub.status === 'ACTIVE' && sub.tier === 'PLUS') {
      throw new ConflictException('Already on Plus');
    }
    const { rates, id: feeConfigVersionId } = await this.fees.getActive();
    const priceKobo = rates.sellerPlus.monthlyKobo;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const email = user?.email ?? `${userId}@reworth.local`;
    const reference = `plus_${userId.replace(/-/g, '').slice(0, 12)}_${Date.now()}`;

    const initiated = await this.psp.initiate({
      amountKobo: priceKobo,
      currency: 'NGN',
      reference,
      email,
      metadata: { kind: 'SELLER_PLUS', userId, idempotencyKey },
      idempotencyKey,
    });
    if (this.psp.name === 'mock-psp') {
      (this.psp as MockPsp).simulateWebhookSuccess(initiated.reference);
    }

    const periodEnd = new Date(Date.now() + 30 * 86_400_000);
    const updated = await this.prisma.sellerSubscription.update({
      where: { userId },
      data: {
        tier: 'PLUS',
        status: 'ACTIVE',
        priceKobo,
        feeConfigVersionId,
        subscriptionRef: initiated.reference,
        currentPeriodEnd: periodEnd,
        graceUntil: null,
        cancelAtPeriodEnd: false,
      },
    });

    await this.ledger.record({
      stream: 'SUBSCRIPTION',
      grossKobo: priceKobo,
      netKobo: priceKobo,
      sellerId: userId,
      pspReference: initiated.reference,
      feeConfigVersionId,
      referenceType: 'SellerSubscription',
      referenceId: `${updated.id}:${initiated.reference}`,
      meta: { tier: 'PLUS', idempotencyKey },
    });

    return { ...updated, checkoutUrl: initiated.checkoutUrl };
  }

  async cancel(userId: string) {
    const sub = await this.getOrCreate(userId);
    if (sub.tier !== 'PLUS') {
      throw new BadRequestException('No Plus subscription to cancel');
    }
    return this.prisma.sellerSubscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
  }

  async downgradeNow(userId: string) {
    return this.prisma.sellerSubscription.update({
      where: { userId },
      data: {
        tier: 'STARTER',
        status: 'CANCELLED',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        graceUntil: null,
      },
    });
  }

  /** Simulate failed renewal → 7-day grace then suspend. */
  async simulatePaymentFailure(userId: string) {
    const { rates } = await this.fees.getActive();
    const graceUntil = new Date(
      Date.now() + rates.sellerPlus.graceDays * 86_400_000,
    );
    return this.prisma.sellerSubscription.update({
      where: { userId },
      data: { status: 'PAST_DUE', graceUntil },
    });
  }

  async tick() {
    const now = new Date();
    const pastDue = await this.prisma.sellerSubscription.findMany({
      where: { status: 'PAST_DUE', graceUntil: { lte: now } },
    });
    for (const s of pastDue) {
      await this.prisma.sellerSubscription.update({
        where: { id: s.id },
        data: { status: 'SUSPENDED', tier: 'STARTER' },
      });
    }
    const cancelDue = await this.prisma.sellerSubscription.findMany({
      where: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { lte: now },
        status: 'ACTIVE',
      },
    });
    for (const s of cancelDue) {
      await this.prisma.sellerSubscription.update({
        where: { id: s.id },
        data: {
          status: 'CANCELLED',
          tier: 'STARTER',
          cancelAtPeriodEnd: false,
        },
      });
    }
  }
}
