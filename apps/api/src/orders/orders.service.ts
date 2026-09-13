import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FulfilmentMethod,
  Order,
  OrderStatus,
  Prisma,
  SwapLegStatus,
  TransactionType,
} from '@prisma/client';
import { DeliveryService } from '../delivery/delivery.service';
import { ListingStateMachine } from '../listings/listing-state.machine';
import { NotificationCategory } from '../notifications/notification-categories';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeDeliveryFeeKobo,
  DELIVERY_PROVIDER,
  type DeliveryProvider,
} from '../providers/delivery.provider';
import { haversineKm } from '../providers/search.provider';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../providers/payment.provider';
import { ReferralsService } from '../referrals/referrals.service';
import { TrustScoreService } from '../reviews/trust-score.service';
import { LuxuryAuthService } from '../verticals/luxury-auth.service';
import { CreateOrderDto } from './dto/orders.dto';
import {
  computeOrderTotalKobo,
  computeProtectionFeeKobo,
} from './order-fees';
import { OrderStateMachine } from './order-state.machine';

export type AddressDisclosureDto = {
  id: string;
  createdAt: Date;
  addressSnapshot: string;
};

export type MeetPointSummaryDto = {
  id: string;
  community: string;
  name: string;
  landmark: string;
  lat: number;
  lng: number;
};

export type OrderDto = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  offerId: string | null;
  orderIntentId: string | null;
  amountKobo: number;
  protectionFeeKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  fulfilmentMethod: FulfilmentMethod;
  status: OrderStatus;
  buyerProtection: boolean;
  coverageEndsAt: Date | null;
  autoReleaseAt: Date | null;
  fundedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  meetPointId?: string | null;
  meetPoint?: MeetPointSummaryDto | null;
  addressDisclosure?: AddressDisclosureDto | null;
  transactionType?: TransactionType;
  swapProposalId?: string | null;
  giveawayClaimId?: string | null;
  swapListingAId?: string | null;
  swapListingBId?: string | null;
  legAStatus?: SwapLegStatus | null;
  legBStatus?: SwapLegStatus | null;
  cashRecipientId?: string | null;
};

function toOrderDto(
  o: Order & {
    meetPoint?: MeetPointSummaryDto | null;
    addressDisclosure?: {
      id: string;
      createdAt: Date;
      addressSnapshot: string;
    } | null;
  },
): OrderDto {
  return {
    id: o.id,
    listingId: o.listingId,
    buyerId: o.buyerId,
    sellerId: o.sellerId,
    offerId: o.offerId,
    orderIntentId: o.orderIntentId,
    amountKobo: o.amountKobo,
    protectionFeeKobo: o.protectionFeeKobo,
    deliveryFeeKobo: o.deliveryFeeKobo,
    totalKobo: o.totalKobo,
    fulfilmentMethod: o.fulfilmentMethod,
    status: o.status,
    buyerProtection: o.buyerProtection,
    coverageEndsAt: o.coverageEndsAt,
    autoReleaseAt: o.autoReleaseAt,
    fundedAt: o.fundedAt,
    completedAt: o.completedAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    meetPointId: o.meetPointId ?? null,
    meetPoint: o.meetPoint
      ? {
          id: o.meetPoint.id,
          community: o.meetPoint.community,
          name: o.meetPoint.name,
          landmark: o.meetPoint.landmark,
          lat: o.meetPoint.lat,
          lng: o.meetPoint.lng,
        }
      : null,
    addressDisclosure: o.addressDisclosure
      ? {
          id: o.addressDisclosure.id,
          createdAt: o.addressDisclosure.createdAt,
          addressSnapshot: o.addressDisclosure.addressSnapshot,
        }
      : null,
    transactionType: o.transactionType,
    swapProposalId: o.swapProposalId,
    giveawayClaimId: o.giveawayClaimId,
    swapListingAId: o.swapListingAId,
    swapListingBId: o.swapListingBId,
    legAStatus: o.legAStatus,
    legBStatus: o.legBStatus,
    cashRecipientId: o.cashRecipientId,
  };
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    @Inject(PAYMENT_PROVIDER) private readonly psp: PaymentProvider,
    @Optional()
    @Inject(DELIVERY_PROVIDER)
    private readonly deliveryProvider?: DeliveryProvider,
    @Optional()
    @Inject(forwardRef(() => DeliveryService))
    private readonly delivery?: DeliveryService,
    @Optional() private readonly trust?: TrustScoreService,
    @Optional()
    @Inject(forwardRef(() => LuxuryAuthService))
    private readonly luxuryAuth?: LuxuryAuthService,
    @Optional() private readonly referrals?: ReferralsService,
  ) {}

  private feePct(): number {
    return Number(this.config.get('BUYER_PROTECTION_FEE_PCT') ?? 0.025);
  }

  private feeCap(): number {
    return Number(
      this.config.get('BUYER_PROTECTION_FEE_CAP_KOBO') ?? 500_000,
    );
  }

  private autoReleaseDays(): number {
    return Number(this.config.get('ORDER_AUTO_RELEASE_DAYS') ?? 3);
  }

  private coverageDays(): number {
    return Number(this.config.get('BUYER_PROTECTION_COVERAGE_DAYS') ?? 7);
  }

  async create(buyerId: string, dto: CreateOrderDto): Promise<OrderDto> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId === buyerId) {
      throw new BadRequestException('Cannot buy your own listing');
    }
    if (!['LIVE', 'RESERVED'].includes(listing.status)) {
      throw new ConflictException(
        `Listing is not available (status=${listing.status})`,
      );
    }

    let amountKobo = listing.priceKobo;
    let offerId: string | undefined = dto.offerId;
    let orderIntentId: string | undefined = dto.orderIntentId;

    if (dto.orderIntentId) {
      const intent = await this.prisma.orderIntent.findUnique({
        where: { id: dto.orderIntentId },
      });
      if (!intent) throw new NotFoundException('OrderIntent not found');
      if (intent.buyerId !== buyerId) {
        throw new ForbiddenException('OrderIntent belongs to another buyer');
      }
      if (intent.status !== 'PENDING') {
        throw new ConflictException(`OrderIntent is ${intent.status}`);
      }
      if (intent.listingId !== dto.listingId) {
        throw new BadRequestException('OrderIntent listing mismatch');
      }
      amountKobo = intent.amountKobo;
      offerId = intent.offerId ?? offerId;
    } else if (dto.offerId) {
      const offer = await this.prisma.offer.findUnique({
        where: { id: dto.offerId },
      });
      if (!offer) throw new NotFoundException('Offer not found');
      if (offer.buyerId !== buyerId) {
        throw new ForbiddenException('Offer belongs to another buyer');
      }
      if (offer.status !== 'ACCEPTED') {
        throw new ConflictException('Offer must be ACCEPTED');
      }
      if (offer.listingId !== dto.listingId) {
        throw new BadRequestException('Offer listing mismatch');
      }
      amountKobo = offer.amountKobo;
    } else if (!dto.buyNow) {
      throw new BadRequestException(
        'Provide buyNow=true, offerId, or orderIntentId',
      );
    }

    const protectionFeeKobo = computeProtectionFeeKobo(
      amountKobo,
      this.feePct(),
      this.feeCap(),
    );

    let deliveryFeeKobo = 0;
    let distanceKm: number | undefined;
    let meetPointId: string | null = null;

    if (dto.fulfilmentMethod === FulfilmentMethod.MEET_POINT) {
      if (!dto.meetPointId) {
        throw new BadRequestException('meetPointId required for MEET_POINT');
      }
      const mp = await this.prisma.meetPoint.findFirst({
        where: { id: dto.meetPointId, active: true },
      });
      if (!mp) throw new NotFoundException('Meet point not found');
      meetPointId = mp.id;
    }

    if (dto.fulfilmentMethod === FulfilmentMethod.DELIVERY) {
      if (
        dto.toLat != null &&
        dto.toLng != null &&
        listing.geoLat != null &&
        listing.geoLng != null
      ) {
        distanceKm = haversineKm(
          listing.geoLat,
          listing.geoLng,
          dto.toLat,
          dto.toLng,
        );
        deliveryFeeKobo = computeDeliveryFeeKobo(distanceKm);
      }
      // Quote may also be applied via GET /orders/:id/delivery-quote before pay
    }

    const totalKobo = computeOrderTotalKobo({
      amountKobo,
      protectionFeeKobo,
      deliveryFeeKobo,
    });

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          listingId: dto.listingId,
          buyerId,
          sellerId: listing.sellerId,
          offerId: offerId ?? null,
          orderIntentId: orderIntentId ?? null,
          amountKobo,
          protectionFeeKobo,
          deliveryFeeKobo,
          totalKobo,
          fulfilmentMethod: dto.fulfilmentMethod,
          meetPointId,
          status: 'CREATED',
          buyerProtection: true,
        },
      });

      if (
        dto.fulfilmentMethod === FulfilmentMethod.DELIVERY &&
        deliveryFeeKobo > 0
      ) {
        const shipment = await tx.deliveryShipment.create({
          data: {
            orderId: created.id,
            provider: this.deliveryProvider?.name ?? 'mock-delivery',
            quoteKobo: deliveryFeeKobo,
            distanceKm: distanceKm ?? null,
            status: 'QUOTED',
          },
        });
        await tx.deliveryEvent.create({
          data: {
            shipmentId: shipment.id,
            status: 'QUOTED',
            payload: {
              toLat: dto.toLat,
              toLng: dto.toLng,
              feeKobo: deliveryFeeKobo,
              distanceKm,
            },
          },
        });
      }

      OrderStateMachine.assertTransition('CREATED', 'PAYMENT_PENDING');
      const pending = await tx.order.update({
        where: { id: created.id },
        data: { status: 'PAYMENT_PENDING' },
      });

      await tx.orderEvent.create({
        data: {
          orderId: created.id,
          type: 'CREATED',
          actorUserId: buyerId,
          payload: { amountKobo, protectionFeeKobo, totalKobo },
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: created.id,
          type: 'PAYMENT_PENDING',
          actorUserId: buyerId,
        },
      });

      if (orderIntentId) {
        await tx.orderIntent.update({
          where: { id: orderIntentId },
          data: { status: 'CONVERTED', orderId: created.id },
        });
      }

      return pending;
    });

    this.notifications.log('order.payment_pending', {
      orderId: order.id,
      buyerId,
      sellerId: listing.sellerId,
    });

    return toOrderDto(order);
  }

  async listForUser(userId: string): Promise<OrderDto[]> {
    const rows = await this.prisma.order.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toOrderDto);
  }

  async getById(
    orderId: string,
    userId: string,
  ): Promise<OrderDto & { events: unknown[] }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        meetPoint: true,
        addressDisclosure: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('Not a participant');
    }
    return { ...toOrderDto(order), events: order.events };
  }

  async markHandedOver(orderId: string, sellerId: string): Promise<OrderDto> {
    const order = await this.requireOrder(orderId);
    if (order.sellerId !== sellerId) {
      throw new ForbiddenException('Only the seller can mark handed over');
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: order.listingId },
    });
    if (listing && this.luxuryAuth) {
      this.luxuryAuth.assertCanHandOver(listing, order.status);
    }

    OrderStateMachine.assertTransition(order.status, 'HANDED_OVER');

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.order.update({
        where: { id: orderId },
        data: { status: 'HANDED_OVER' },
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          type: 'HANDED_OVER',
          actorUserId: sellerId,
        },
      });
      return row;
    });

    this.notifications.log('order.handed_over', {
      orderId,
      buyerId: order.buyerId,
      sellerId,
    });
    return toOrderDto(updated);
  }

  async confirmReceipt(orderId: string, buyerId: string): Promise<OrderDto> {
    const order = await this.requireOrder(orderId);
    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Only the buyer can confirm receipt');
    }

    // Race with dispute: if already DISPUTE_HOLD, reject
    if (order.status === 'DISPUTE_HOLD') {
      throw new ConflictException('Order is in dispute hold');
    }
    OrderStateMachine.assertTransition(order.status, 'RECEIVED');

    const coverageEndsAt = new Date(
      Date.now() + this.coverageDays() * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: 'HANDED_OVER' },
        data: {
          status: 'RECEIVED',
          coverageEndsAt,
        },
      });
      if (claimed.count === 0) {
        throw new ConflictException('Order status changed; cannot confirm');
      }
      await tx.orderEvent.create({
        data: {
          orderId,
          type: 'RECEIVED',
          actorUserId: buyerId,
          payload: { coverageEndsAt },
        },
      });
    });

    this.notifications.log('order.received', { orderId, buyerId });

    // Release escrow → COMPLETED + Payout
    return this.releaseEscrow(orderId, buyerId, 'confirm_receipt');
  }

  async cancel(orderId: string, buyerId: string): Promise<OrderDto> {
    const order = await this.requireOrder(orderId);
    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Only the buyer can cancel');
    }
    if (!['CREATED', 'PAYMENT_PENDING'].includes(order.status)) {
      throw new ConflictException('Can only cancel pre-funding');
    }
    OrderStateMachine.assertTransition(order.status, 'CANCELLED');

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          type: 'CANCELLED',
          actorUserId: buyerId,
        },
      });
      return row;
    });

    this.notifications.log('order.cancelled', { orderId, buyerId });
    return toOrderDto(updated);
  }

  /**
   * Called from payment webhook on success. Idempotent.
   */
  async markFunded(orderId: string, paymentReference: string): Promise<OrderDto> {
    const order = await this.requireOrder(orderId);
    if (order.status === 'FUNDED' || this.isPostFunded(order.status)) {
      return toOrderDto(order);
    }
    OrderStateMachine.assertTransition(order.status, 'FUNDED');

    const autoReleaseAt = new Date(
      Date.now() + this.autoReleaseDays() * 24 * 60 * 60 * 1000,
    );
    const fundedAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: 'PAYMENT_PENDING' },
        data: {
          status: 'FUNDED',
          fundedAt,
          autoReleaseAt,
        },
      });
      if (claimed.count === 0) {
        return tx.order.findUniqueOrThrow({ where: { id: orderId } });
      }

      await tx.orderEvent.create({
        data: {
          orderId,
          type: 'FUNDED',
          payload: { paymentReference, autoReleaseAt },
        },
      });

      // Keep listing RESERVED until completed (MVP)
      const listing = await tx.listing.findUnique({
        where: { id: order.listingId },
      });
      if (listing && listing.status === 'LIVE') {
        ListingStateMachine.assertTransition(listing.status, 'RESERVED');
        await tx.listing.update({
          where: { id: listing.id },
          data: { status: 'RESERVED' },
        });
      }

      return tx.order.findUniqueOrThrow({ where: { id: orderId } });
    });

    this.notifications.log('order.funded', {
      orderId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      paymentReference,
    });

    await this.notifications.notify({
      userId: order.sellerId,
      category: NotificationCategory.PAYMENT_RECEIVED,
      title: 'Payment received',
      body: 'Buyer payment is in escrow for your listing.',
      deepLink: `reworth://orders/${orderId}`,
      meta: { orderId, paymentReference },
    });
    await this.notifications.notify({
      userId: order.buyerId,
      category: NotificationCategory.PAYMENT_RECEIVED,
      title: 'Payment confirmed',
      body: 'Your payment is secured in ReWorth escrow.',
      deepLink: `reworth://orders/${orderId}`,
      meta: { orderId, paymentReference },
    });

    if (updated.fulfilmentMethod === FulfilmentMethod.DELIVERY) {
      await this.delivery?.assignAfterFunding(orderId);
    }

    // Luxury auth gate: FUNDED → IN_AUTHENTICATION when required
    if (this.luxuryAuth) {
      await this.luxuryAuth.afterOrderFunded(orderId).catch((err) =>
        this.logger.warn(
          `Luxury auth after fund failed: ${(err as Error).message}`,
        ),
      );
      const refreshed = await this.requireOrder(orderId);
      if (refreshed.status === 'IN_AUTHENTICATION') {
        return toOrderDto(refreshed);
      }
    }

    // Swap+cash: if both legs already RECEIVED, release + complete now
    if (
      updated.transactionType === TransactionType.SWAP_CASH &&
      this.legsFullyReceived(updated)
    ) {
      return this.completeSwapOrGiveaway(orderId, null);
    }

    return toOrderDto(updated);
  }

  /**
   * Release escrow to seller: Payment RELEASED, Payout once, order COMPLETED.
   * Idempotent via IdempotencyRecord + payout uniqueness check.
   */
  async releaseEscrow(
    orderId: string,
    actorUserId: string | null,
    reason: string,
  ): Promise<OrderDto> {
    const idemKey = `release:${orderId}`;
    const existingIdem = await this.prisma.idempotencyRecord.findUnique({
      where: { key: idemKey },
    });
    if (existingIdem) {
      const order = await this.requireOrder(orderId);
      return toOrderDto(order);
    }

    const existingPayout = await this.prisma.payout.findFirst({
      where: { orderId },
    });
    if (existingPayout) {
      const order = await this.requireOrder(orderId);
      if (order.status !== 'COMPLETED') {
        return this.finalizeCompleted(orderId, actorUserId, reason);
      }
      return toOrderDto(order);
    }

    const order = await this.requireOrder(orderId);
    const payment = await this.prisma.payment.findFirst({
      where: { orderId, status: { in: ['SUCCESS', 'RELEASED'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) {
      throw new ConflictException('No successful payment to release');
    }
    if (payment.status === 'RELEASED') {
      return this.finalizeCompleted(orderId, actorUserId, reason);
    }

    const releaseResult = await this.psp.release({
      reference: payment.reference,
      amountKobo: order.amountKobo,
      idempotencyKey: idemKey,
    });

    const feesKobo = order.protectionFeeKobo;
    const netKobo = order.amountKobo;
    const grossKobo = order.amountKobo + order.protectionFeeKobo;

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'RELEASED',
          providerPayload: {
            ...(payment.providerPayload as object),
            release: releaseResult,
          } as Prisma.InputJsonValue,
        },
      });

      const payoutExists = await tx.payout.findFirst({ where: { orderId } });
      if (!payoutExists) {
        await tx.payout.create({
          data: {
            orderId,
            grossKobo,
            feesKobo,
            netKobo,
            pspReference: releaseResult.providerRef ?? null,
          },
        });
      }

      await tx.idempotencyRecord.upsert({
        where: { key: idemKey },
        create: {
          key: idemKey,
          operation: 'escrow_release',
          responseJson: releaseResult as unknown as Prisma.InputJsonValue,
        },
        update: {},
      });
    });

    return this.finalizeCompleted(orderId, actorUserId, reason);
  }

  private async finalizeCompleted(
    orderId: string,
    actorUserId: string | null,
    reason: string,
  ): Promise<OrderDto> {
    const order = await this.requireOrder(orderId);
    if (order.status === 'COMPLETED') return toOrderDto(order);

    if (
      order.status !== 'RECEIVED' &&
      order.status !== 'HANDED_OVER' &&
      order.status !== 'FUNDED' &&
      order.status !== 'DISPUTE_HOLD' &&
      order.status !== 'CREATED'
    ) {
      // From RECEIVED path we already set RECEIVED; allow COMPLETED from RECEIVED
      if (!OrderStateMachine.canTransition(order.status, 'COMPLETED')) {
        OrderStateMachine.assertTransition(order.status, 'COMPLETED');
      }
    }

    if (
      order.status === 'RECEIVED' ||
      order.status === 'DISPUTE_HOLD' ||
      order.status === 'CREATED'
    ) {
      OrderStateMachine.assertTransition(order.status, 'COMPLETED');
    } else if (
      order.status === 'HANDED_OVER' ||
      order.status === 'FUNDED'
    ) {
      // Auto-release may skip RECEIVED
      OrderStateMachine.assertTransition(order.status, 'COMPLETED');
    }

    const completedAt = new Date();
    const coverageEndsAt =
      order.coverageEndsAt ??
      new Date(Date.now() + this.coverageDays() * 24 * 60 * 60 * 1000);

    const listingIds = new Set<string>([order.listingId]);
    if (order.swapListingAId) listingIds.add(order.swapListingAId);
    if (order.swapListingBId) listingIds.add(order.swapListingBId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          completedAt,
          coverageEndsAt,
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          type: 'COMPLETED',
          actorUserId,
          payload: { reason },
        },
      });

      for (const listingId of listingIds) {
        const listing = await tx.listing.findUnique({
          where: { id: listingId },
        });
        if (listing && listing.status !== 'SOLD') {
          ListingStateMachine.assertTransition(listing.status, 'SOLD');
          await tx.listing.update({
            where: { id: listing.id },
            data: { status: 'SOLD' },
          });
          await tx.listingEvent.create({
            data: {
              listingId: listing.id,
              type: 'STATUS_CHANGED',
              actorUserId,
              payload: {
                from: listing.status,
                to: 'SOLD',
                reason: 'order_completed',
              },
            },
          });
        }
      }

      if (order.swapProposalId) {
        await tx.swapProposal.updateMany({
          where: { id: order.swapProposalId, status: 'ACCEPTED' },
          data: { status: 'COMPLETED' },
        });
      }
      if (order.giveawayClaimId) {
        await tx.giveawayClaim.updateMany({
          where: { id: order.giveawayClaimId, status: 'APPROVED' },
          data: { status: 'COMPLETED' },
        });
      }

      return row;
    });

    this.notifications.log('order.completed', {
      orderId,
      reason,
      sellerId: order.sellerId,
    });
    if (order.amountKobo > 0) {
      await this.notifications.notify({
        userId: order.sellerId,
        category: NotificationCategory.PAYMENT_RELEASED,
        title: 'Payout released',
        body: 'Escrow has been released to you.',
        deepLink: `reworth://orders/${orderId}`,
        meta: { orderId, reason },
      });
    } else {
      await this.notifications.notify({
        userId: order.sellerId,
        category: NotificationCategory.ITEM_SOLD,
        title: 'Order completed',
        body: 'Your swap / give-away order is complete.',
        deepLink: `reworth://orders/${orderId}`,
        meta: { orderId, reason },
      });
    }

    void Promise.all([
      this.trust?.recompute(order.buyerId, 'order_completed'),
      this.trust?.recompute(order.sellerId, 'order_completed'),
    ]).catch((err) =>
      this.logger.warn(
        `Trust recompute after complete failed: ${(err as Error).message}`,
      ),
    );

    if (this.referrals) {
      void this.referrals
        .onOrderCompleted(order.buyerId, orderId)
        .catch((err) =>
          this.logger.warn(
            `Referral reward after complete failed: ${(err as Error).message}`,
          ),
        );
    }

    return toOrderDto(updated);
  }

  private isNonCashTransaction(order: Order): boolean {
    return (
      order.transactionType === TransactionType.SWAP ||
      order.transactionType === TransactionType.GIVEAWAY ||
      (order.transactionType === TransactionType.SWAP_CASH &&
        order.amountKobo === 0)
    );
  }

  private legsFullyReceived(order: Order): boolean {
    if (order.transactionType === TransactionType.GIVEAWAY) {
      return order.legAStatus === 'RECEIVED';
    }
    if (
      order.transactionType === TransactionType.SWAP ||
      order.transactionType === TransactionType.SWAP_CASH
    ) {
      return order.legAStatus === 'RECEIVED' && order.legBStatus === 'RECEIVED';
    }
    return false;
  }

  private parseLeg(leg: string): 'A' | 'B' {
    const upper = leg.toUpperCase();
    if (upper !== 'A' && upper !== 'B') {
      throw new BadRequestException('leg must be A or B');
    }
    return upper;
  }

  /**
   * Dual-leg hand-over for swap / give-away orders.
   * Leg A = target listing (seller → buyer). Leg B = offered (buyer → seller).
   */
  async markLegHandedOver(
    orderId: string,
    legParam: string,
    userId: string,
  ): Promise<OrderDto> {
    const leg = this.parseLeg(legParam);
    const order = await this.requireOrder(orderId);
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('Not a participant');
    }
    if (
      order.transactionType !== TransactionType.SWAP &&
      order.transactionType !== TransactionType.SWAP_CASH &&
      order.transactionType !== TransactionType.GIVEAWAY
    ) {
      throw new BadRequestException('Order is not a swap/give-away');
    }
    if (leg === 'B' && order.transactionType === TransactionType.GIVEAWAY) {
      throw new BadRequestException('Give-away orders only have leg A');
    }

    const expectedActor = leg === 'A' ? order.sellerId : order.buyerId;
    if (userId !== expectedActor) {
      throw new ForbiddenException(
        leg === 'A'
          ? 'Only the seller can hand over leg A'
          : 'Only the buyer can hand over leg B',
      );
    }

    const statusField = leg === 'A' ? 'legAStatus' : 'legBStatus';
    const current = order[statusField];
    if (current === 'HANDED_OVER' || current === 'RECEIVED') {
      return toOrderDto(order); // idempotent
    }
    if (current !== 'PENDING') {
      throw new ConflictException(`Leg ${leg} is ${current}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.order.update({
        where: { id: orderId },
        data: { [statusField]: 'HANDED_OVER' },
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          type: `LEG_${leg}_HANDED_OVER`,
          actorUserId: userId,
        },
      });
      return row;
    });

    this.notifications.log('order.leg_handed_over', {
      orderId,
      leg,
      userId,
    });
    return toOrderDto(updated);
  }

  async confirmLegReceipt(
    orderId: string,
    legParam: string,
    userId: string,
  ): Promise<OrderDto> {
    const leg = this.parseLeg(legParam);
    const order = await this.requireOrder(orderId);
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('Not a participant');
    }
    if (
      order.transactionType !== TransactionType.SWAP &&
      order.transactionType !== TransactionType.SWAP_CASH &&
      order.transactionType !== TransactionType.GIVEAWAY
    ) {
      throw new BadRequestException('Order is not a swap/give-away');
    }
    if (leg === 'B' && order.transactionType === TransactionType.GIVEAWAY) {
      throw new BadRequestException('Give-away orders only have leg A');
    }

    // Receiver confirms: leg A → buyer; leg B → seller
    const expectedActor = leg === 'A' ? order.buyerId : order.sellerId;
    if (userId !== expectedActor) {
      throw new ForbiddenException(
        leg === 'A'
          ? 'Only the buyer can confirm receipt of leg A'
          : 'Only the seller can confirm receipt of leg B',
      );
    }

    const statusField = leg === 'A' ? 'legAStatus' : 'legBStatus';
    const current = order[statusField];
    if (current === 'RECEIVED') {
      return toOrderDto(order); // idempotent
    }
    if (current !== 'HANDED_OVER') {
      throw new ConflictException(
        `Leg ${leg} must be HANDED_OVER before confirm (got ${current})`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.order.update({
        where: { id: orderId },
        data: { [statusField]: 'RECEIVED' },
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          type: `LEG_${leg}_RECEIVED`,
          actorUserId: userId,
        },
      });
      return row;
    });

    this.notifications.log('order.leg_received', { orderId, leg, userId });

    if (this.legsFullyReceived(updated)) {
      return this.completeSwapOrGiveaway(orderId, userId);
    }
    return toOrderDto(updated);
  }

  async failLeg(
    orderId: string,
    legParam: string,
    userId: string,
    reason?: string,
  ): Promise<OrderDto> {
    const leg = this.parseLeg(legParam);
    const order = await this.requireOrder(orderId);
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('Not a participant');
    }
    if (
      order.transactionType !== TransactionType.SWAP &&
      order.transactionType !== TransactionType.SWAP_CASH &&
      order.transactionType !== TransactionType.GIVEAWAY
    ) {
      throw new BadRequestException('Order is not a swap/give-away');
    }
    if (order.status === 'COMPLETED' || order.status === 'DISPUTE_HOLD') {
      throw new ConflictException(`Order is ${order.status}`);
    }

    OrderStateMachine.assertTransition(order.status, 'DISPUTE_HOLD');

    const statusField = leg === 'A' ? 'legAStatus' : 'legBStatus';
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.order.update({
        where: { id: orderId },
        data: {
          [statusField]: 'FAILED',
          status: 'DISPUTE_HOLD',
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          type: `LEG_${leg}_FAILED`,
          actorUserId: userId,
          payload: { reason: reason ?? null },
        },
      });
      await tx.supportTicket.create({
        data: {
          orderId,
          userId,
          subject: `SWAP_LEG_FAILURE leg ${leg}`,
          status: 'OPEN',
        },
      });
      await tx.riskEvent.create({
        data: {
          userId,
          listingId: order.listingId,
          kind: 'SWAP_LEG_FAILURE',
          detail: {
            orderId,
            leg,
            reason: reason ?? null,
          } as Prisma.InputJsonValue,
        },
      });
      return row;
    });

    await this.notifications.notify({
      userId: order.buyerId,
      category: NotificationCategory.DISPUTE_UPDATE,
      title: 'Swap fulfilment issue',
      body: `Leg ${leg} was marked failed. Support will follow up.`,
      deepLink: `reworth://orders/${orderId}`,
      meta: { orderId, leg, reason },
    });
    await this.notifications.notify({
      userId: order.sellerId,
      category: NotificationCategory.DISPUTE_UPDATE,
      title: 'Swap fulfilment issue',
      body: `Leg ${leg} was marked failed. Support will follow up.`,
      deepLink: `reworth://orders/${orderId}`,
      meta: { orderId, leg, reason },
    });

    return toOrderDto(updated);
  }

  /**
   * Complete swap/give-away when required legs are RECEIVED.
   * Pure swap / give-away: skip payment release.
   * SWAP_CASH with funded escrow: release then complete.
   */
  async completeSwapOrGiveaway(
    orderId: string,
    actorUserId: string | null,
  ): Promise<OrderDto> {
    const order = await this.requireOrder(orderId);
    if (!this.legsFullyReceived(order)) {
      throw new ConflictException('Not all required legs are RECEIVED');
    }
    if (order.status === 'COMPLETED') return toOrderDto(order);

    if (this.isNonCashTransaction(order) || order.amountKobo === 0) {
      // Pure swap / give-away — no PaymentsService calls
      return this.finalizeCompleted(orderId, actorUserId, 'swap_legs_complete');
    }

    // SWAP_CASH: release escrow if funded; otherwise wait for payment
    const payment = await this.prisma.payment.findFirst({
      where: { orderId, status: { in: ['SUCCESS', 'RELEASED'] } },
    });
    if (payment && payment.status !== 'RELEASED') {
      return this.releaseEscrow(orderId, actorUserId, 'swap_legs_complete');
    }
    if (payment?.status === 'RELEASED') {
      return this.finalizeCompleted(orderId, actorUserId, 'swap_legs_complete');
    }

    // Legs done but cash not funded yet — leave PAYMENT_PENDING; complete after fund
    this.notifications.log('order.swap_legs_awaiting_payment', {
      orderId,
      status: order.status,
    });
    return toOrderDto(order);
  }

  async autoReleaseDue(now = new Date()): Promise<number> {
    const due = await this.prisma.order.findMany({
      where: {
        status: { in: ['FUNDED', 'HANDED_OVER'] },
        autoReleaseAt: { lte: now },
      },
      select: { id: true },
    });

    let count = 0;
    for (const row of due) {
      try {
        await this.releaseEscrow(row.id, null, 'auto_release');
        count++;
      } catch (err) {
        this.logger.warn(
          `Auto-release failed for ${row.id}: ${(err as Error).message}`,
        );
      }
    }
    if (count > 0) {
      this.logger.log(`Auto-released ${count} order(s)`);
    }
    return count;
  }

  async requireOrder(orderId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private isPostFunded(status: OrderStatus): boolean {
    return [
      'IN_AUTHENTICATION',
      'HANDED_OVER',
      'RECEIVED',
      'COMPLETED',
      'DISPUTE_HOLD',
      'REFUND_REQUESTED',
      'REFUND_ISSUED',
    ].includes(status);
  }
}
