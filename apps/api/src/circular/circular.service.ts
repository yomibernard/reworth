import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CircularHandoffStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { NotificationCategory } from '../notifications/notification-categories';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateCircularPartnerDto,
  ScheduleHandoffDto,
  UpdateCircularPartnerDto,
} from './dto/circular.dto';

@Injectable()
export class CircularService {
  private readonly logger = new Logger(CircularService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async createPartner(dto: CreateCircularPartnerDto) {
    return this.prisma.circularPartner.create({
      data: {
        name: dto.name.trim(),
        kind: dto.kind,
        city: dto.city?.trim() || 'Lagos',
        acceptedCategories: dto.acceptedCategories ?? [],
        contactEmail: dto.contactEmail?.trim().toLowerCase(),
        verified: dto.verified ?? false,
        active: true,
      },
    });
  }

  async updatePartner(id: string, dto: UpdateCircularPartnerDto) {
    const existing = await this.prisma.circularPartner.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Circular partner not found');
    return this.prisma.circularPartner.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
        ...(dto.acceptedCategories !== undefined
          ? { acceptedCategories: dto.acceptedCategories }
          : {}),
        ...(dto.contactEmail !== undefined
          ? { contactEmail: dto.contactEmail.trim().toLowerCase() }
          : {}),
        ...(dto.verified !== undefined ? { verified: dto.verified } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async listPartners(city?: string) {
    const items = await this.prisma.circularPartner.findMany({
      where: {
        active: true,
        ...(city ? { city } : {}),
      },
      orderBy: { name: 'asc' },
    });
    return { items };
  }

  async getPartner(id: string) {
    const row = await this.prisma.circularPartner.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Circular partner not found');
    return row;
  }

  async deletePartner(id: string) {
    await this.getPartner(id);
    await this.prisma.circularPartner.update({
      where: { id },
      data: { active: false },
    });
    return { id, active: false };
  }

  async scheduleHandoff(sellerId: string, dto: ScheduleHandoffDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('Only the seller can schedule a hand-off');
    }
    if (!['LIVE', 'DRAFT', 'EXPIRED'].includes(listing.status)) {
      throw new ConflictException(
        `Cannot hand off listing in status ${listing.status}`,
      );
    }

    const partner = await this.prisma.circularPartner.findUnique({
      where: { id: dto.circularPartnerId },
    });
    if (!partner || !partner.active) {
      throw new NotFoundException('Circular partner not found');
    }

    const open = await this.prisma.circularHandoff.findFirst({
      where: {
        listingId: listing.id,
        status: { in: ['SCHEDULED', 'PICKED_UP'] },
      },
    });
    if (open) {
      throw new ConflictException('Hand-off already scheduled for listing');
    }

    const handoff = await this.prisma.circularHandoff.create({
      data: {
        listingId: listing.id,
        sellerId,
        circularPartnerId: partner.id,
        status: 'SCHEDULED',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
        recipientLabel: dto.recipientLabel?.trim() || partner.name,
      },
      include: { partner: true, listing: true },
    });

    return this.toHandoffDto(handoff);
  }

  async completeHandoff(handoffId: string, actorUserId?: string) {
    const handoff = await this.prisma.circularHandoff.findUnique({
      where: { id: handoffId },
      include: { partner: true, listing: true },
    });
    if (!handoff) throw new NotFoundException('Hand-off not found');
    if (handoff.status === 'COMPLETED') {
      return this.toHandoffDto(handoff);
    }
    if (handoff.status === 'CANCELLED') {
      throw new ConflictException('Hand-off was cancelled');
    }
    if (actorUserId && handoff.sellerId !== actorUserId) {
      throw new ForbiddenException('Only the seller can complete this hand-off');
    }

    const receiptKey = `receipts/circular/${handoff.id}/${randomBytes(8).toString('hex')}.pdf`;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.circularHandoff.update({
        where: { id: handoffId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          receiptKey,
        },
        include: { partner: true, listing: true },
      });
      await tx.listing.update({
        where: { id: handoff.listingId },
        data: { status: 'REMOVED' },
      });
      await tx.listingEvent.create({
        data: {
          listingId: handoff.listingId,
          type: 'STATUS_CHANGED',
          payload: {
            from: handoff.listing.status,
            to: 'REMOVED',
            reason: 'circular_handoff',
            handoffId,
            partnerId: handoff.circularPartnerId,
            receiptKey,
          },
        },
      });
      return row;
    });

    const itemTitle = updated.listing.title || 'item';
    const partnerName = updated.partner.name;
    if (this.notifications) {
      await this.notifications.notify({
        userId: updated.sellerId,
        category: NotificationCategory.ITEM_SOLD,
        title: 'Item donated',
        body: `Your ${itemTitle} was donated to ${partnerName}`,
        meta: {
          handoffId: updated.id,
          listingId: updated.listingId,
          partnerName,
          receiptKey,
        },
      });
    }

    this.logger.log({
      event: 'circular.handoff.completed',
      handoffId,
      receiptKey,
      listingId: updated.listingId,
    });

    return this.toHandoffDto(updated);
  }

  /**
   * Donate-if-unsold scheduler: LIVE listings past publishedAt + donateIfUnsoldDays
   * get auto-scheduled to a matching city charity/recycler.
   */
  async processDonateIfUnsold(now = new Date()): Promise<number> {
    const candidates = await this.prisma.listing.findMany({
      where: {
        status: 'LIVE',
        donateIfUnsoldDays: { not: null, gt: 0 },
        publishedAt: { not: null },
      },
      take: 100,
    });

    let scheduled = 0;
    for (const listing of candidates) {
      const days = listing.donateIfUnsoldDays!;
      const dueAt = new Date(
        listing.publishedAt!.getTime() + days * 86_400_000,
      );
      if (dueAt.getTime() > now.getTime()) continue;

      const open = await this.prisma.circularHandoff.findFirst({
        where: {
          listingId: listing.id,
          status: { in: ['SCHEDULED', 'PICKED_UP', 'COMPLETED'] },
        },
      });
      if (open) continue;

      const partner = await this.prisma.circularPartner.findFirst({
        where: {
          active: true,
          verified: true,
          city: listing.city,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!partner) {
        this.logger.warn(
          `No circular partner for city=${listing.city} listing=${listing.id}`,
        );
        continue;
      }

      await this.prisma.circularHandoff.create({
        data: {
          listingId: listing.id,
          sellerId: listing.sellerId,
          circularPartnerId: partner.id,
          status: 'SCHEDULED',
          scheduledAt: now,
          recipientLabel: partner.name,
        },
      });
      scheduled++;
    }
    if (scheduled > 0) {
      this.logger.log(`Scheduled ${scheduled} donate-if-unsold hand-off(s)`);
    }
    return scheduled;
  }

  async setDonateIfUnsold(
    sellerId: string,
    listingId: string,
    days: number | null,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('Not your listing');
    }
    if (days != null && days < 1) {
      throw new BadRequestException('donateIfUnsoldDays must be >= 1');
    }
    return this.prisma.listing.update({
      where: { id: listingId },
      data: { donateIfUnsoldDays: days },
      select: {
        id: true,
        donateIfUnsoldDays: true,
        status: true,
      },
    });
  }

  private toHandoffDto(h: {
    id: string;
    listingId: string;
    sellerId: string;
    circularPartnerId: string;
    status: CircularHandoffStatus;
    scheduledAt: Date | null;
    completedAt: Date | null;
    receiptKey: string | null;
    recipientLabel: string;
    partner?: { id: string; name: string; kind: string };
    listing?: { id: string; title: string };
  }) {
    return {
      id: h.id,
      listingId: h.listingId,
      sellerId: h.sellerId,
      circularPartnerId: h.circularPartnerId,
      status: h.status,
      scheduledAt: h.scheduledAt,
      completedAt: h.completedAt,
      receiptKey: h.receiptKey,
      recipientLabel: h.recipientLabel,
      partner: h.partner
        ? { id: h.partner.id, name: h.partner.name, kind: h.partner.kind }
        : undefined,
      listing: h.listing
        ? { id: h.listing.id, title: h.listing.title }
        : undefined,
    };
  }
}
