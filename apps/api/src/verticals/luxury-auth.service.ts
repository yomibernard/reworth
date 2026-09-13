import { randomUUID } from 'crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { ListingStateMachine } from '../listings/listing-state.machine';
import { NotificationCategory } from '../notifications/notification-categories';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStateMachine } from '../orders/order-state.machine';
import { PrismaService } from '../prisma/prisma.service';
import {
  AUTHENTICATION_PROVIDER,
  type AuthenticationProvider,
} from '../providers/authentication.provider';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../providers/payment.provider';
import { AuthWebhookDto } from './dto/verticals.dto';

function opaqueCertificateId(): string {
  return `cert_${randomUUID().replace(/-/g, '')}`;
}

@Injectable()
export class LuxuryAuthService {
  private readonly logger = new Logger(LuxuryAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    @Inject(AUTHENTICATION_PROVIDER)
    private readonly authProvider: AuthenticationProvider,
    @Inject(PAYMENT_PROVIDER) private readonly psp: PaymentProvider,
  ) {}

  feeKobo(): number {
    return Number(this.config.get<string>('AUTH_FEE_KOBO') ?? '1500000');
  }

  listingNeedsAuth(listing: {
    authRequired: boolean;
    authenticationStatus: string;
  }): boolean {
    if (!listing.authRequired) return false;
    if (listing.authenticationStatus === 'PASSED') return false;
    if (listing.authenticationStatus === 'OPTED_OUT') return false;
    return true;
  }

  /**
   * After cash order is FUNDED: enter IN_AUTHENTICATION + create job when required.
   */
  async afterOrderFunded(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { listing: true, luxuryAuthJob: true },
    });
    if (!order || !order.listing) return;
    if (order.luxuryAuthJob) return;
    if (order.status !== 'FUNDED') return;
    if (!this.listingNeedsAuth(order.listing)) return;

    OrderStateMachine.assertTransition(order.status, 'IN_AUTHENTICATION');
    const feeKobo = this.feeKobo();

    const job = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'IN_AUTHENTICATION' },
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          type: 'IN_AUTHENTICATION',
          payload: { feeKobo },
        },
      });
      await tx.listing.update({
        where: { id: order.listingId },
        data: { authenticationStatus: 'PENDING' },
      });
      return tx.luxuryAuthJob.create({
        data: {
          listingId: order.listingId,
          orderId,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          status: 'PENDING',
          feeKobo,
          mode: 'SHIP_TO_AUTH',
        },
      });
    });

    const started = await this.authProvider.start({
      jobId: job.id,
      listingId: order.listingId,
      orderId,
      mode: 'SHIP_TO_AUTH',
    });
    await this.prisma.luxuryAuthJob.update({
      where: { id: job.id },
      data: { partnerRef: started.partnerRef, status: 'IN_PROGRESS' },
    });

    await this.notifications.notify({
      userId: order.buyerId,
      category: NotificationCategory.VERIFICATION_UPDATE,
      title: 'Authentication in progress',
      body: 'This luxury item is being authenticated before handover.',
      deepLink: `reworth://orders/${orderId}`,
      meta: { orderId },
    });
    await this.notifications.notify({
      userId: order.sellerId,
      category: NotificationCategory.VERIFICATION_UPDATE,
      title: 'Authentication required',
      body: 'Buyer payment is held while authentication completes.',
      deepLink: `reworth://orders/${orderId}`,
      meta: { orderId },
    });
  }

  /** Block handover while auth is outstanding. */
  assertCanHandOver(listing: {
    authRequired: boolean;
    authenticationStatus: string;
  }, orderStatus: string): void {
    if (orderStatus === 'IN_AUTHENTICATION') {
      throw new ConflictException(
        'Order is in authentication; cannot hand over yet',
      );
    }
    if (
      this.listingNeedsAuth(listing) &&
      listing.authenticationStatus !== 'PASSED'
    ) {
      throw new ConflictException(
        'Listing requires authentication before sale can complete',
      );
    }
  }

  async handlePartnerComplete(dto: AuthWebhookDto) {
    const job = await this.prisma.luxuryAuthJob.findFirst({
      where: {
        OR: [
          dto.jobId ? { id: dto.jobId } : undefined,
          dto.partnerRef ? { partnerRef: dto.partnerRef } : undefined,
        ].filter(Boolean) as Prisma.LuxuryAuthJobWhereInput[],
      },
      include: { order: true, listing: true },
    });
    if (!job) throw new NotFoundException('Auth job not found');
    if (job.status === 'PASSED' || job.status === 'FAILED') {
      return job; // idempotent
    }

    if (dto.passed) {
      return this.markPassed(job, dto);
    }
    return this.markFailed(job, dto);
  }

  private async markPassed(
    job: Prisma.LuxuryAuthJobGetPayload<{
      include: { order: true; listing: true };
    }>,
    dto: AuthWebhookDto,
  ) {
    const certificateId = dto.certificateId ?? opaqueCertificateId();
    const completedAt = new Date();

    OrderStateMachine.assertTransition(job.order.status, 'FUNDED');

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.luxuryAuthJob.update({
        where: { id: job.id },
        data: {
          status: 'PASSED',
          certificateId,
          evidenceJson: (dto.evidence ?? {}) as Prisma.InputJsonValue,
          completedAt,
        },
      });
      await tx.listing.update({
        where: { id: job.listingId },
        data: {
          authenticationStatus: 'PASSED',
          certificateId,
          authenticatedAt: completedAt,
        },
      });
      await tx.order.update({
        where: { id: job.orderId },
        data: { status: 'FUNDED' },
      });
      await tx.orderEvent.create({
        data: {
          orderId: job.orderId,
          type: 'AUTH_PASSED',
          payload: { certificateId, jobId: job.id },
        },
      });
      return row;
    });

    await this.notifications.notify({
      userId: job.buyerId,
      category: NotificationCategory.VERIFICATION_UPDATE,
      title: 'Item authenticated',
      body: 'Authentication passed. Ready for handover.',
      deepLink: `reworth://orders/${job.orderId}`,
      meta: { orderId: job.orderId, certificateId },
    });
    await this.notifications.notify({
      userId: job.sellerId,
      category: NotificationCategory.VERIFICATION_UPDATE,
      title: 'Authentication passed',
      body: 'Your item is marked Authentic. Proceed to handover.',
      deepLink: `reworth://orders/${job.orderId}`,
      meta: { orderId: job.orderId, certificateId },
    });

    return updated;
  }

  private async markFailed(
    job: Prisma.LuxuryAuthJobGetPayload<{
      include: { order: true; listing: true };
    }>,
    dto: AuthWebhookDto,
  ) {
    const completedAt = new Date();
    const failReason = dto.failReason ?? 'Authentication failed';

    // Cancel order path → REFUND_REQUESTED then issue refund idempotently
    if (job.order.status === 'IN_AUTHENTICATION') {
      OrderStateMachine.assertTransition(job.order.status, 'REFUND_REQUESTED');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.luxuryAuthJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          failReason,
          evidenceJson: (dto.evidence ?? {}) as Prisma.InputJsonValue,
          completedAt,
        },
      });
      const listing = await tx.listing.findUniqueOrThrow({
        where: { id: job.listingId },
      });
      if (listing.status !== 'REMOVED') {
        ListingStateMachine.assertTransition(listing.status, 'REMOVED');
        await tx.listing.update({
          where: { id: job.listingId },
          data: {
            authenticationStatus: 'FAILED',
            status: 'REMOVED',
          },
        });
        await tx.listingEvent.create({
          data: {
            listingId: job.listingId,
            type: 'STATUS_CHANGED',
            payload: {
              from: listing.status,
              to: 'REMOVED',
              reason: 'auth_failed',
              failReason,
            },
          },
        });
      } else {
        await tx.listing.update({
          where: { id: job.listingId },
          data: { authenticationStatus: 'FAILED' },
        });
      }
      if (job.order.status === 'IN_AUTHENTICATION') {
        await tx.order.update({
          where: { id: job.orderId },
          data: { status: 'REFUND_REQUESTED' },
        });
        await tx.orderEvent.create({
          data: {
            orderId: job.orderId,
            type: 'AUTH_FAILED',
            payload: { failReason, jobId: job.id },
          },
        });
      }
    });

    await this.issueFullRefundIdempotent(job.orderId, failReason);

    await this.notifications.notify({
      userId: job.buyerId,
      category: NotificationCategory.VERIFICATION_UPDATE,
      title: 'Authentication failed — refunded',
      body: 'The item did not pass authentication. A full refund has been issued.',
      deepLink: `reworth://orders/${job.orderId}`,
      meta: { orderId: job.orderId, failReason },
    });
    await this.notifications.notify({
      userId: job.sellerId,
      category: NotificationCategory.VERIFICATION_UPDATE,
      title: 'Authentication failed',
      body: 'Your listing was removed after failed authentication.',
      deepLink: `reworth://listings/${job.listingId}`,
      meta: { orderId: job.orderId, failReason },
    });

    return this.prisma.luxuryAuthJob.findUniqueOrThrow({ where: { id: job.id } });
  }

  /** Full refund of order total; idempotent via Refund.idempotencyKey. */
  async issueFullRefundIdempotent(
    orderId: string,
    reason: string,
  ): Promise<{ refunded: boolean; already: boolean }> {
    const idemKey = `luxury-auth-refund:${orderId}`;
    const existing = await this.prisma.refund.findUnique({
      where: { idempotencyKey: idemKey },
    });
    if (existing) {
      return { refunded: true, already: true };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const payment = order.payments.find((p) =>
      ['SUCCESS', 'RELEASED', 'PARTIALLY_REFUNDED'].includes(p.status),
    );
    if (!payment) {
      this.logger.warn(`No refundable payment for order ${orderId}`);
      // Still mark REFUND_ISSUED if already REFUND_REQUESTED (mock cash path)
      if (order.status === 'REFUND_REQUESTED') {
        OrderStateMachine.assertTransition(order.status, 'REFUND_ISSUED');
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: 'REFUND_ISSUED' },
        });
      } else if (order.status === 'IN_AUTHENTICATION' || order.status === 'CANCELLED') {
        // no-op
      }
      return { refunded: false, already: false };
    }

    const result = await this.psp.refund({
      reference: payment.reference,
      amountKobo: order.totalKobo,
      idempotencyKey: idemKey,
    });
    const payStatus =
      result.status === 'partially_refunded' ? 'PARTIALLY_REFUNDED' : 'REFUNDED';

    await this.prisma.$transaction(async (tx) => {
      const again = await tx.refund.findUnique({
        where: { idempotencyKey: idemKey },
      });
      if (again) return;
      await tx.refund.create({
        data: {
          orderId,
          paymentId: payment.id,
          amountKobo: order.totalKobo,
          reason,
          idempotencyKey: idemKey,
          status: payStatus,
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: payStatus },
      });
      const current = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (current.status === 'REFUND_REQUESTED') {
        OrderStateMachine.assertTransition(current.status, 'REFUND_ISSUED');
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'REFUND_ISSUED' },
        });
      } else if (current.status === 'IN_AUTHENTICATION') {
        OrderStateMachine.assertTransition(current.status, 'CANCELLED');
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' },
        });
      }
      await tx.orderEvent.create({
        data: {
          orderId,
          type: 'AUTH_REFUND',
          payload: { amountKobo: order.totalKobo, reason, idemKey },
        },
      });
    });

    return { refunded: true, already: false };
  }

  async listAdmin(take = 100) {
    return this.prisma.luxuryAuthJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 200),
      include: {
        listing: { select: { id: true, title: true } },
        order: { select: { id: true, status: true, totalKobo: true } },
      },
    });
  }

  async getJob(jobId: string) {
    const job = await this.prisma.luxuryAuthJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Auth job not found');
    return job;
  }
}
