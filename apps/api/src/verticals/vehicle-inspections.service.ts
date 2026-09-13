import {
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
import { Prisma } from '@prisma/client';
import { NotificationCategory } from '../notifications/notification-categories';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  INSPECTION_PROVIDER,
  type InspectionProvider,
} from '../providers/inspection.provider';
import { MockPsp } from '../providers/mock-psp';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../providers/payment.provider';
import { inspectedBadgeFromLatest } from './inspected-badge';
import {
  InspectionWebhookDto,
  RequestInspectionDto,
  ScheduleInspectionDto,
} from './dto/verticals.dto';

@Injectable()
export class VehicleInspectionsService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(VehicleInspectionsService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    @Inject(INSPECTION_PROVIDER) private readonly inspection: InspectionProvider,
    @Inject(PAYMENT_PROVIDER) private readonly psp: PaymentProvider,
  ) {}

  onModuleInit() {
    const disabled =
      process.env.NODE_ENV === 'test' ||
      this.config.get<string>('INSPECTION_EXPIRY_SCHEDULER') === 'false';
    if (disabled) return;
    const hourMs = 60 * 60 * 1000;
    this.timer = setInterval(() => {
      void this.expireDueBadges().catch((err) =>
        this.logger.warn(`Inspection expiry failed: ${(err as Error).message}`),
      );
    }, hourMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  feeKobo(): number {
    return Number(this.config.get<string>('INSPECTION_FEE_KOBO') ?? '2500000');
  }

  validityDays(): number {
    return Number(this.config.get<string>('INSPECTION_VALIDITY_DAYS') ?? '30');
  }

  async request(
    listingId: string,
    requesterId: string,
    dto: RequestInspectionDto,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (!listing.vehicle && listing.sellerId !== requesterId) {
      // Allow any authenticated user; vehicles are the primary target
    }

    const feeKobo = this.feeKobo();
    const row = await this.prisma.vehicleInspection.create({
      data: {
        listingId,
        requesterId,
        status: 'PAYMENT_PENDING',
        feeKobo,
        slotLabel: dto.slotLabel ?? null,
      },
    });

    const reference = `insp_${row.id.replace(/-/g, '').slice(0, 16)}_${Date.now()}`;
    const user = await this.prisma.user.findUnique({ where: { id: requesterId } });
    const result = await this.psp.initiate({
      amountKobo: feeKobo,
      currency: 'NGN',
      reference,
      email: user?.email ?? `${requesterId}@reworth.local`,
      metadata: { inspectionId: row.id, kind: 'INSPECTION_FEE' },
      idempotencyKey: `insp-init:${row.id}`,
    });

    const updated = await this.prisma.vehicleInspection.update({
      where: { id: row.id },
      data: { paymentRef: result.reference, status: 'PAYMENT_PENDING' },
    });

    return {
      ...updated,
      checkoutUrl: result.checkoutUrl,
      feeKobo,
    };
  }

  async pay(inspectionId: string, userId: string) {
    const row = await this.requireInspection(inspectionId);
    if (row.requesterId !== userId) {
      throw new ForbiddenException('Only the requester can pay');
    }
    if (row.status !== 'PAYMENT_PENDING' && row.status !== 'REQUESTED') {
      throw new ConflictException(`Inspection is ${row.status}`);
    }

    let paymentRef = row.paymentRef;
    if (!paymentRef) {
      const reference = `insp_${row.id.replace(/-/g, '').slice(0, 16)}_${Date.now()}`;
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const result = await this.psp.initiate({
        amountKobo: row.feeKobo,
        currency: 'NGN',
        reference,
        email: user?.email ?? `${userId}@reworth.local`,
        metadata: { inspectionId: row.id, kind: 'INSPECTION_FEE' },
        idempotencyKey: `insp-pay:${row.id}`,
      });
      paymentRef = result.reference;
      await this.prisma.vehicleInspection.update({
        where: { id: row.id },
        data: { paymentRef },
      });
    }

    if (this.psp.name === 'mock-psp') {
      (this.psp as MockPsp).simulateWebhookSuccess(paymentRef);
    }

    return this.prisma.vehicleInspection.update({
      where: { id: row.id },
      data: { status: 'REQUESTED', paymentRef },
    });
  }

  async schedule(inspectionId: string, userId: string, dto: ScheduleInspectionDto) {
    const row = await this.requireInspection(inspectionId);
    const listing = await this.prisma.listing.findUnique({
      where: { id: row.listingId },
    });
    if (row.requesterId !== userId && listing?.sellerId !== userId) {
      throw new ForbiddenException('Not allowed to schedule');
    }
    if (row.status !== 'REQUESTED') {
      throw new ConflictException(
        `Inspection must be REQUESTED after payment (got ${row.status})`,
      );
    }

    const scheduledAt = dto.scheduledAt
      ? new Date(dto.scheduledAt)
      : undefined;
    const result = await this.inspection.schedule({
      listingId: row.listingId,
      inspectionId: row.id,
      slotLabel: dto.slotLabel ?? row.slotLabel ?? undefined,
      scheduledAt,
    });

    return this.prisma.vehicleInspection.update({
      where: { id: row.id },
      data: {
        status: 'SCHEDULED',
        partnerRef: result.partnerRef,
        scheduledAt: result.scheduledAt,
        slotLabel: result.slotLabel,
      },
    });
  }

  async handleWebhook(dto: InspectionWebhookDto) {
    const row = await this.prisma.vehicleInspection.findFirst({
      where: {
        OR: [
          dto.inspectionId ? { id: dto.inspectionId } : undefined,
          dto.partnerRef ? { partnerRef: dto.partnerRef } : undefined,
        ].filter(Boolean) as Prisma.VehicleInspectionWhereInput[],
      },
    });
    if (!row) throw new NotFoundException('Inspection not found');
    if (row.status === 'COMPLETED' || row.status === 'EXPIRED') {
      return row; // idempotent
    }
    if (!['SCHEDULED', 'IN_PROGRESS', 'REQUESTED'].includes(row.status)) {
      throw new ConflictException(`Cannot complete from ${row.status}`);
    }

    const completedAt = new Date();
    const expiresAt = new Date(
      completedAt.getTime() + this.validityDays() * 24 * 60 * 60 * 1000,
    );

    const updated = await this.prisma.vehicleInspection.update({
      where: { id: row.id },
      data: {
        status: 'COMPLETED',
        conditionScore: dto.conditionScore ?? null,
        verifiedMileage: dto.verifiedMileage ?? null,
        accidentNotes: dto.accidentNotes ?? null,
        tyreBatteryNotes: dto.tyreBatteryNotes ?? null,
        registrationOk: dto.registrationOk ?? null,
        reportPhotos: (dto.reportPhotos ?? []) as Prisma.InputJsonValue,
        reportChecklist: (dto.reportChecklist ?? {}) as Prisma.InputJsonValue,
        completedAt,
        expiresAt,
        partnerRef: dto.partnerRef ?? row.partnerRef,
      },
    });

    const listing = await this.prisma.listing.findUnique({
      where: { id: row.listingId },
    });
    if (listing) {
      await this.notifications.notify({
        userId: listing.sellerId,
        category: NotificationCategory.VERIFICATION_UPDATE,
        title: 'Vehicle inspection complete',
        body: 'Your listing now shows an Inspected badge.',
        deepLink: `reworth://listings/${listing.id}`,
        meta: { inspectionId: row.id },
      });
    }

    return updated;
  }

  async getById(id: string) {
    const row = await this.requireInspection(id);
    return {
      ...row,
      inspectedBadge: inspectedBadgeFromLatest(row),
    };
  }

  async latestForListing(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    const row = await this.prisma.vehicleInspection.findFirst({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      inspection: row,
      inspectedBadge: inspectedBadgeFromLatest(row),
    };
  }

  async listAdmin(take = 100) {
    return this.prisma.vehicleInspection.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 200),
      include: {
        listing: { select: { id: true, title: true, sellerId: true } },
        requester: { select: { id: true } },
      },
    });
  }

  async expireDueBadges(now = new Date()): Promise<number> {
    const due = await this.prisma.vehicleInspection.findMany({
      where: {
        status: 'COMPLETED',
        expiresAt: { lte: now },
      },
      select: { id: true },
    });
    let count = 0;
    for (const row of due) {
      await this.prisma.vehicleInspection.update({
        where: { id: row.id },
        data: { status: 'EXPIRED' },
      });
      count++;
    }
    if (count > 0) {
      this.logger.log(`Expired ${count} inspection badge(s)`);
    }
    return count;
  }

  /** Attach latest completed/expired inspection id for dispute evidence context. */
  async latestInspectionIdForListing(listingId: string): Promise<string | null> {
    const row = await this.prisma.vehicleInspection.findFirst({
      where: {
        listingId,
        status: { in: ['COMPLETED', 'EXPIRED'] },
      },
      orderBy: { completedAt: 'desc' },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  private async requireInspection(id: string) {
    const row = await this.prisma.vehicleInspection.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Inspection not found');
    return row;
  }
}
