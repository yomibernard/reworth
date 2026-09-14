import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PromotionKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../providers/payment.provider';
import { MockPsp } from '../providers/mock-psp';
import { FeeConfigService } from './fee-config.service';
import { RevenueLedgerService } from './revenue-ledger.service';

@Injectable()
export class SellerPromotionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SellerPromotionsService.name);
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
      this.config.get('BOOST_EXPIRY_SCHEDULER') === 'false'
    ) {
      return;
    }
    this.timer = setInterval(() => {
      void this.expireEnded().catch((e) =>
        this.logger.warn(`boost expiry: ${(e as Error).message}`),
      );
    }, 60_000);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async quoteBoost(hours: number) {
    const { rates, id, version } = await this.fees.getActive();
    if (!rates.boost.durationsHours.includes(hours)) {
      throw new BadRequestException(
        `Invalid boost duration. Allowed: ${rates.boost.durationsHours.join(', ')}h`,
      );
    }
    const priceKobo = rates.boost.priceByHoursKobo[String(hours)];
    if (priceKobo == null) {
      throw new BadRequestException('No price for duration');
    }
    return { hours, priceKobo, feeConfigVersionId: id, version };
  }

  async quoteFeatured() {
    const { rates, id, version } = await this.fees.getActive();
    return {
      hours: rates.featured.durationHours,
      priceKobo: rates.featured.priceKobo,
      feeConfigVersionId: id,
      version,
    };
  }

  async purchaseBoost(
    sellerId: string,
    listingId: string,
    hours: number,
    idempotencyKey: string,
  ) {
    const existing = await this.prisma.promotion.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return this.toDto(existing);

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('Not your listing');
    }
    if (listing.status !== 'LIVE') {
      throw new ConflictException('Only LIVE listings can be boosted');
    }

    const quote = await this.quoteBoost(hours);
    const seller = await this.prisma.user.findUnique({ where: { id: sellerId } });
    const email = seller?.email ?? `${sellerId}@reworth.local`;
    const reference = `boost_${listingId.replace(/-/g, '').slice(0, 12)}_${Date.now()}`;

    const initiated = await this.psp.initiate({
      amountKobo: quote.priceKobo,
      currency: 'NGN',
      reference,
      email,
      metadata: { kind: 'BOOST', listingId },
      idempotencyKey,
    });

    // Mock PSP: auto-succeed for seller self-serve demos
    if (this.psp.name === 'mock-psp') {
      (this.psp as MockPsp).simulateWebhookSuccess(initiated.reference);
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + hours * 3_600_000);
    const promo = await this.prisma.promotion.create({
      data: {
        listingId,
        kind: 'BOOST',
        startsAt: now,
        endsAt,
        feeKobo: quote.priceKobo,
        feeConfigVersionId: quote.feeConfigVersionId,
        pspReference: initiated.reference,
        paymentStatus: 'SUCCESS',
        idempotencyKey,
        createdById: sellerId,
      },
    });

    await this.ledger.record({
      stream: 'BOOST',
      grossKobo: quote.priceKobo,
      netKobo: quote.priceKobo,
      listingId,
      sellerId,
      city: listing.city,
      categoryId: listing.categoryId ?? undefined,
      pspReference: initiated.reference,
      feeConfigVersionId: quote.feeConfigVersionId,
      referenceType: 'Promotion',
      referenceId: promo.id,
      meta: { hours },
    });

    return {
      ...this.toDto(promo),
      checkoutUrl: initiated.checkoutUrl,
    };
  }

  async purchaseFeatured(
    sellerId: string,
    listingId: string,
    idempotencyKey: string,
  ) {
    const existing = await this.prisma.promotion.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return this.toDto(existing);

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('Not your listing');
    }
    if (listing.status !== 'LIVE') {
      throw new ConflictException('Only LIVE listings can be featured');
    }

    const quote = await this.quoteFeatured();
    const seller = await this.prisma.user.findUnique({ where: { id: sellerId } });
    const email = seller?.email ?? `${sellerId}@reworth.local`;
    const reference = `feat_${listingId.replace(/-/g, '').slice(0, 12)}_${Date.now()}`;

    const initiated = await this.psp.initiate({
      amountKobo: quote.priceKobo,
      currency: 'NGN',
      reference,
      email,
      metadata: { kind: 'FEATURED', listingId },
      idempotencyKey,
    });
    if (this.psp.name === 'mock-psp') {
      (this.psp as MockPsp).simulateWebhookSuccess(initiated.reference);
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + quote.hours * 3_600_000);
    const promo = await this.prisma.promotion.create({
      data: {
        listingId,
        kind: 'FEATURED',
        startsAt: now,
        endsAt,
        feeKobo: quote.priceKobo,
        feeConfigVersionId: quote.feeConfigVersionId,
        pspReference: initiated.reference,
        paymentStatus: 'SUCCESS',
        idempotencyKey,
        createdById: sellerId,
      },
    });

    await this.ledger.record({
      stream: 'FEATURED',
      grossKobo: quote.priceKobo,
      netKobo: quote.priceKobo,
      listingId,
      sellerId,
      city: listing.city,
      categoryId: listing.categoryId ?? undefined,
      pspReference: initiated.reference,
      feeConfigVersionId: quote.feeConfigVersionId,
      referenceType: 'Promotion',
      referenceId: promo.id,
    });

    return { ...this.toDto(promo), checkoutUrl: initiated.checkoutUrl };
  }

  async activeForListing(listingId: string) {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: {
        listingId,
        startsAt: { lte: now },
        endsAt: { gt: now },
        paymentStatus: { in: ['SUCCESS', 'none'] },
      },
      orderBy: { endsAt: 'desc' },
    });
  }

  async expireEnded() {
    // Soft: ranking queries filter by endsAt; log for observability
    const now = new Date();
    const ended = await this.prisma.promotion.count({
      where: {
        kind: { in: ['BOOST', 'FEATURED'] as PromotionKind[] },
        endsAt: { lte: now, gte: new Date(now.getTime() - 120_000) },
      },
    });
    if (ended > 0) {
      this.logger.log({ event: 'promotions.expired_window', count: ended });
    }
  }

  private toDto(p: {
    id: string;
    listingId: string;
    kind: PromotionKind;
    startsAt: Date;
    endsAt: Date;
    feeKobo: number;
    paymentStatus: string;
    pspReference: string | null;
  }) {
    const now = Date.now();
    return {
      id: p.id,
      listingId: p.listingId,
      kind: p.kind,
      startsAt: p.startsAt,
      endsAt: p.endsAt,
      feeKobo: p.feeKobo,
      paymentStatus: p.paymentStatus,
      pspReference: p.pspReference,
      active: p.startsAt.getTime() <= now && p.endsAt.getTime() > now,
    };
  }
}
