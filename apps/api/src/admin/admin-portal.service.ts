import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListingStatus,
  Prisma,
  SupportTicketStatus,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { ModerationService } from '../moderation/moderation.service';
import { NotificationCategory } from '../notifications/notification-categories';
import { NotificationsService } from '../notifications/notifications.service';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../providers/payment.provider';
import { PrismaService } from '../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import type {
  AdminAppealResolveDto,
  AdminExtendExpiryDto,
  AdminFeatureListingDto,
  AdminHeroBannerDto,
  AdminPromotionCreateDto,
  AdminRefundDto,
  AdminRejectListingDto,
  AdminRejectVerificationDto,
  AdminReportActionDto,
  AdminSupportNoteDto,
  AdminSupportPatchDto,
  AdminSupportRespondDto,
  AdminWhitelistDto,
} from './dto/admin-ops.dto';

@Injectable()
export class AdminPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly moderation: ModerationService,
    @Inject(PAYMENT_PROVIDER) private readonly psp: PaymentProvider,
  ) {}

  // ── Users ──────────────────────────────────────────────────────────

  async listUsers(q?: string, community?: string, cursor?: string) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
              {
                profile: {
                  displayName: { contains: q, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
      ...(community
        ? { profile: { preferredCommunity: community } }
        : {}),
    };
    const take = 50;
    const rows = await this.prisma.user.findMany({
      where,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: { profile: true, roles: true },
    });
    const nextCursor = rows.length > take ? rows[take - 1]!.id : null;
    return {
      items: rows.slice(0, take).map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        status: u.status,
        displayName: u.profile?.displayName ?? null,
        community: u.profile?.preferredCommunity ?? null,
        roles: u.roles.map((r) => r.role),
        createdAt: u.createdAt,
      })),
      nextCursor,
    };
  }

  async exportUsersCsv() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: { profile: true, roles: true },
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    });
    const header = 'id,email,phone,status,displayName,community,roles,createdAt';
    const lines = users.map((u) =>
      [
        u.id,
        u.email ?? '',
        u.phone ?? '',
        u.status,
        JSON.stringify(u.profile?.displayName ?? ''),
        u.profile?.preferredCommunity ?? '',
        u.roles.map((r) => r.role).join('|'),
        u.createdAt.toISOString(),
      ].join(','),
    );
    return [header, ...lines].join('\n');
  }

  async suspendUser(
    actor: AuthUser,
    userId: string,
    reason: string | undefined,
    ip?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const before = { status: user.status };
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.SUSPENDED },
    });
    await this.auth.revokeAllRefreshTokens(userId);
    await this.notifications.notify({
      userId,
      category: NotificationCategory.VERIFICATION_UPDATE,
      title: 'Account suspended',
      body: reason ?? 'Your ReWorth account has been suspended.',
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'USER_SUSPENDED',
      entityType: 'User',
      entityId: userId,
      beforeJson: before,
      afterJson: { status: UserStatus.SUSPENDED, reason: reason ?? null },
      ip: ip ?? null,
    });
    return { ok: true, userId, status: UserStatus.SUSPENDED };
  }

  async unsuspendUser(actor: AuthUser, userId: string, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'USER_UNSUSPENDED',
      entityType: 'User',
      entityId: userId,
      ip: ip ?? null,
    });
    return { ok: true, userId, status: UserStatus.ACTIVE };
  }

  async resetVerification(actor: AuthUser, userId: string, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.verification.updateMany({
      where: { userId, level: 'L3_IDENTITY' },
      data: {
        status: VerificationStatus.PENDING,
        verifiedAt: null,
        rejectionReason: null,
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'USER_VERIFICATION_RESET',
      entityType: 'User',
      entityId: userId,
      ip: ip ?? null,
    });
    return { ok: true };
  }

  async whitelistUser(
    actor: AuthUser,
    userId: string,
    dto: AdminWhitelistDto,
    ip?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const entry = await this.prisma.whitelistEntry.create({
      data: {
        userId,
        reason: dto.reason,
        createdById: actor.id,
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'USER_WHITELISTED',
      entityType: 'WhitelistEntry',
      entityId: entry.id,
      afterJson: { userId, reason: dto.reason },
      ip: ip ?? null,
    });
    return entry;
  }

  // ── Listings ───────────────────────────────────────────────────────

  async listListings(status?: string, flag?: string) {
    const where: Prisma.ListingWhereInput = {
      ...(status ? { status: status as ListingStatus } : {}),
      ...(flag ? { riskFlags: { has: flag } } : {}),
    };
    const items = await this.prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        seller: { include: { profile: true } },
        category: true,
      },
    });
    return {
      items: items.map((l) => ({
        id: l.id,
        title: l.title,
        status: l.status,
        priceKobo: l.priceKobo,
        community: l.community,
        riskFlags: l.riskFlags,
        sellerId: l.sellerId,
        sellerName: l.seller.profile?.displayName ?? null,
        category: l.category?.name ?? null,
        createdAt: l.createdAt,
        expiresAt: l.expiresAt,
      })),
    };
  }

  async approveListing(actor: AuthUser, id: string, ip?: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status !== ListingStatus.UNDER_REVIEW) {
      throw new BadRequestException('Listing must be UNDER_REVIEW');
    }
    const updated = await this.prisma.listing.update({
      where: { id },
      data: {
        status: ListingStatus.LIVE,
        publishedAt: listing.publishedAt ?? new Date(),
      },
    });
    await this.notifications.notify({
      userId: listing.sellerId,
      category: NotificationCategory.ITEM_SOLD,
      title: 'Listing approved',
      body: `"${listing.title}" is now live on ReWorth.`,
      deepLink: `/listings/${id}`,
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'LISTING_APPROVED',
      entityType: 'Listing',
      entityId: id,
      beforeJson: { status: listing.status },
      afterJson: { status: updated.status },
      ip: ip ?? null,
    });
    return { ok: true, id, status: updated.status };
  }

  async rejectListing(
    actor: AuthUser,
    id: string,
    dto: AdminRejectListingDto,
    ip?: string,
  ) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    const updated = await this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.REJECTED },
    });
    await this.notifications.notify({
      userId: listing.sellerId,
      category: NotificationCategory.VERIFICATION_UPDATE,
      title: 'Listing rejected',
      body: dto.reason,
      deepLink: `/listings/${id}`,
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'LISTING_REJECTED',
      entityType: 'Listing',
      entityId: id,
      afterJson: { reason: dto.reason },
      ip: ip ?? null,
    });
    return { ok: true, id, status: updated.status };
  }

  async removeListing(actor: AuthUser, id: string, ip?: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    await this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.REMOVED },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'LISTING_REMOVED',
      entityType: 'Listing',
      entityId: id,
      ip: ip ?? null,
    });
    return { ok: true, id, status: ListingStatus.REMOVED };
  }

  async featureListing(
    actor: AuthUser,
    id: string,
    dto: AdminFeatureListingDto,
    ip?: string,
  ) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + dto.days * 86_400_000);
    const promo = await this.prisma.promotion.create({
      data: {
        listingId: id,
        kind: 'FEATURED',
        startsAt,
        endsAt,
        feeKobo: dto.feeKobo,
        createdById: actor.id,
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'LISTING_FEATURED',
      entityType: 'Promotion',
      entityId: promo.id,
      afterJson: { listingId: id, days: dto.days, feeKobo: dto.feeKobo },
      ip: ip ?? null,
    });
    return promo;
  }

  async extendExpiry(
    actor: AuthUser,
    id: string,
    dto: AdminExtendExpiryDto,
    ip?: string,
  ) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    const base = listing.expiresAt ?? new Date();
    const expiresAt = new Date(base.getTime() + dto.days * 86_400_000);
    await this.prisma.listing.update({
      where: { id },
      data: { expiresAt },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'LISTING_EXPIRY_EXTENDED',
      entityType: 'Listing',
      entityId: id,
      afterJson: { expiresAt, days: dto.days },
      ip: ip ?? null,
    });
    return { ok: true, id, expiresAt };
  }

  // ── Orders ─────────────────────────────────────────────────────────

  async listOrders() {
    const items = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        listing: { select: { title: true, community: true } },
        buyer: { include: { profile: true } },
        seller: { include: { profile: true } },
        payments: true,
      },
    });
    return {
      items: items.map((o) => ({
        id: o.id,
        status: o.status,
        totalKobo: o.totalKobo,
        listingTitle: o.listing.title,
        community: o.listing.community,
        buyerName: o.buyer.profile?.displayName ?? null,
        sellerName: o.seller.profile?.displayName ?? null,
        paymentStatus: o.payments[0]?.status ?? null,
        createdAt: o.createdAt,
      })),
    };
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        listing: true,
        payments: true,
        refunds: true,
        payouts: true,
        events: { orderBy: { createdAt: 'asc' } },
        disputes: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async refundOrder(
    actor: AuthUser,
    id: string,
    dto: AdminRefundDto,
    ip?: string,
  ) {
    if (!dto.confirm) {
      throw new BadRequestException('confirm must be true');
    }
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    const payment = order.payments.find((p) =>
      ['SUCCESS', 'RELEASED', 'PARTIALLY_REFUNDED'].includes(p.status),
    );
    if (!payment) {
      throw new BadRequestException('No refundable payment');
    }
    if (dto.amountKobo > order.totalKobo) {
      throw new BadRequestException('Refund exceeds order total');
    }
    const idemKey = `admin-refund:${id}:${dto.amountKobo}:${dto.reason}`;
    const existing = await this.prisma.refund.findUnique({
      where: { idempotencyKey: idemKey },
    });
    if (existing) return existing;

    const result = await this.psp.refund({
      reference: payment.reference,
      amountKobo: dto.amountKobo,
      idempotencyKey: idemKey,
    });
    const payStatus =
      result.status === 'partially_refunded' ? 'PARTIALLY_REFUNDED' : 'REFUNDED';

    const refund = await this.prisma.$transaction(async (tx) => {
      const r = await tx.refund.create({
        data: {
          orderId: id,
          paymentId: payment.id,
          amountKobo: dto.amountKobo,
          reason: dto.reason,
          idempotencyKey: idemKey,
          status: payStatus,
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: payStatus },
      });
      await tx.order.update({
        where: { id },
        data: { status: 'REFUND_ISSUED' },
      });
      await tx.orderEvent.create({
        data: {
          orderId: id,
          type: 'ADMIN_REFUND',
          actorUserId: actor.id,
          payload: { amountKobo: dto.amountKobo, reason: dto.reason },
        },
      });
      return r;
    });

    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'ORDER_REFUNDED',
      entityType: 'Order',
      entityId: id,
      afterJson: { amountKobo: dto.amountKobo, reason: dto.reason },
      ip: ip ?? null,
    });
    return refund;
  }

  // ── Disputes / Verifications / Reports / Fraud ─────────────────────

  async listDisputes(status?: string) {
    return {
      items: await this.prisma.dispute.findMany({
        where: status ? { status: status as never } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          order: { select: { id: true, totalKobo: true, status: true } },
          opener: { include: { profile: true } },
        },
      }),
    };
  }

  async listVerifications(status = 'PENDING') {
    return {
      items: await this.prisma.verification.findMany({
        where: { status: status as VerificationStatus },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: { include: { profile: true } },
        },
      }),
    };
  }

  async approveVerification(actor: AuthUser, id: string, ip?: string) {
    const row = await this.prisma.verification.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Verification not found');
    const updated = await this.prisma.verification.update({
      where: { id },
      data: {
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
        rejectionReason: null,
      },
    });
    await this.notifications.notify({
      userId: row.userId,
      category: NotificationCategory.VERIFICATION_UPDATE,
      title: 'Identity verified',
      body: 'Your identity verification was approved.',
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'VERIFICATION_APPROVED',
      entityType: 'Verification',
      entityId: id,
      ip: ip ?? null,
    });
    return updated;
  }

  async rejectVerification(
    actor: AuthUser,
    id: string,
    dto: AdminRejectVerificationDto,
    ip?: string,
  ) {
    const row = await this.prisma.verification.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Verification not found');
    const updated = await this.prisma.verification.update({
      where: { id },
      data: {
        status: VerificationStatus.REJECTED,
        rejectionReason: dto.reason,
      },
    });
    await this.notifications.notify({
      userId: row.userId,
      category: NotificationCategory.VERIFICATION_UPDATE,
      title: 'Verification rejected',
      body: dto.reason,
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'VERIFICATION_REJECTED',
      entityType: 'Verification',
      entityId: id,
      afterJson: { reason: dto.reason },
      ip: ip ?? null,
    });
    return updated;
  }

  async listReports() {
    return {
      items: await this.prisma.report.findMany({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          listing: { select: { id: true, title: true } },
          reportedUser: { include: { profile: true } },
          reporter: { include: { profile: true } },
        },
      }),
    };
  }

  async dismissReport(actor: AuthUser, id: string, ip?: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    await this.prisma.report.update({
      where: { id },
      data: { status: 'DISMISSED' },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'REPORT_DISMISSED',
      entityType: 'Report',
      entityId: id,
      ip: ip ?? null,
    });
    return { ok: true };
  }

  async actionReport(
    actor: AuthUser,
    id: string,
    dto: AdminReportActionDto,
    ip?: string,
  ) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    if (dto.action === 'WARN' && report.reportedUserId) {
      await this.prisma.userWarning.create({
        data: {
          userId: report.reportedUserId,
          message: dto.message ?? report.reason,
          createdById: actor.id,
        },
      });
      await this.notifications.notify({
        userId: report.reportedUserId,
        category: NotificationCategory.VERIFICATION_UPDATE,
        title: 'Account warning',
        body: dto.message ?? report.reason,
      });
    } else if (dto.action === 'REMOVE_LISTING' && report.listingId) {
      await this.removeListing(actor, report.listingId, ip);
    } else if (dto.action === 'SUSPEND_USER' && report.reportedUserId) {
      await this.suspendUser(
        actor,
        report.reportedUserId,
        dto.message ?? report.reason,
        ip,
      );
    }

    await this.prisma.report.update({
      where: { id },
      data: { status: 'RESOLVED' },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'REPORT_ACTIONED',
      entityType: 'Report',
      entityId: id,
      afterJson: { action: dto.action },
      ip: ip ?? null,
    });
    return { ok: true, action: dto.action };
  }

  async listRiskEvents() {
    return {
      items: await this.prisma.riskEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: { include: { profile: true } },
          listing: { select: { id: true, title: true } },
        },
      }),
    };
  }

  async reviewRiskEvent(actor: AuthUser, id: string, ip?: string) {
    const row = await this.prisma.riskEvent.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Risk event not found');
    const updated = await this.prisma.riskEvent.update({
      where: { id },
      data: { reviewedAt: new Date(), reviewedById: actor.id },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'RISK_EVENT_REVIEWED',
      entityType: 'RiskEvent',
      entityId: id,
      ip: ip ?? null,
    });
    return updated;
  }

  async listAppeals() {
    return this.moderation.listOpenAppeals();
  }

  async resolveAppeal(
    actor: AuthUser,
    id: string,
    dto: AdminAppealResolveDto,
    ip?: string,
  ) {
    const updated = await this.moderation.resolveAppeal(
      id,
      actor.id,
      dto.status,
      dto.note,
    );
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'MODERATION_APPEAL_RESOLVED',
      entityType: 'ModerationAppeal',
      entityId: id,
      afterJson: { status: dto.status, note: dto.note ?? null },
      ip: ip ?? null,
    });
    return updated;
  }

  // ── Support ────────────────────────────────────────────────────────

  async listSupportTickets() {
    return {
      items: await this.prisma.supportTicket.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: { include: { profile: true } },
          assignee: { include: { profile: true } },
          _count: { select: { notes: true } },
        },
      }),
    };
  }

  async getSupportTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { include: { profile: true } },
        assignee: { include: { profile: true } },
        notes: {
          orderBy: { createdAt: 'asc' },
          include: { author: { include: { profile: true } } },
        },
        order: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async patchSupportTicket(
    actor: AuthUser,
    id: string,
    dto: AdminSupportPatchDto,
    ip?: string,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(dto.status
          ? { status: dto.status as SupportTicketStatus }
          : {}),
        ...(dto.assigneeId !== undefined
          ? { assigneeId: dto.assigneeId }
          : {}),
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'SUPPORT_TICKET_UPDATED',
      entityType: 'SupportTicket',
      entityId: id,
      afterJson: dto as unknown as Prisma.InputJsonValue,
      ip: ip ?? null,
    });
    return updated;
  }

  async addSupportNote(
    actor: AuthUser,
    id: string,
    dto: AdminSupportNoteDto,
    ip?: string,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const note = await this.prisma.supportTicketNote.create({
      data: {
        ticketId: id,
        authorId: actor.id,
        body: dto.body,
        internal: dto.internal ?? true,
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'SUPPORT_NOTE_ADDED',
      entityType: 'SupportTicketNote',
      entityId: note.id,
      ip: ip ?? null,
    });
    return note;
  }

  async respondSupport(
    actor: AuthUser,
    id: string,
    dto: AdminSupportRespondDto,
    ip?: string,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const note = await this.addSupportNote(
      actor,
      id,
      { body: dto.body, internal: false },
      ip,
    );
    await this.notifications.notify({
      userId: ticket.userId,
      category: NotificationCategory.VERIFICATION_UPDATE,
      title: 'Support reply',
      body: dto.body,
    });
    // Optional stub: system chat message if conversation linked — notify only for MVP
    return { note, notified: true };
  }

  // ── Catalog / Promotions / Analytics / Audit ───────────────────────

  async listCategories() {
    return {
      items: await this.prisma.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    };
  }

  async createCategory(actor: AuthUser, data: Prisma.CategoryCreateInput, ip?: string) {
    const row = await this.prisma.category.create({ data });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'CATEGORY_CREATED',
      entityType: 'Category',
      entityId: row.id,
      ip: ip ?? null,
    });
    return row;
  }

  async updateCategory(
    actor: AuthUser,
    id: string,
    data: Prisma.CategoryUpdateInput,
    ip?: string,
  ) {
    const row = await this.prisma.category.update({ where: { id }, data });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'CATEGORY_UPDATED',
      entityType: 'Category',
      entityId: id,
      ip: ip ?? null,
    });
    return row;
  }

  async deleteCategory(actor: AuthUser, id: string, ip?: string) {
    await this.prisma.category.delete({ where: { id } });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'CATEGORY_DELETED',
      entityType: 'Category',
      entityId: id,
      ip: ip ?? null,
    });
    return { ok: true };
  }

  async listMeetPoints() {
    return {
      items: await this.prisma.meetPoint.findMany({
        orderBy: { community: 'asc' },
      }),
    };
  }

  async createMeetPoint(
    actor: AuthUser,
    data: Prisma.MeetPointCreateInput,
    ip?: string,
  ) {
    const row = await this.prisma.meetPoint.create({ data });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'MEET_POINT_CREATED',
      entityType: 'MeetPoint',
      entityId: row.id,
      ip: ip ?? null,
    });
    return row;
  }

  async updateMeetPoint(
    actor: AuthUser,
    id: string,
    data: Prisma.MeetPointUpdateInput,
    ip?: string,
  ) {
    const row = await this.prisma.meetPoint.update({ where: { id }, data });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'MEET_POINT_UPDATED',
      entityType: 'MeetPoint',
      entityId: id,
      ip: ip ?? null,
    });
    return row;
  }

  async deleteMeetPoint(actor: AuthUser, id: string, ip?: string) {
    await this.prisma.meetPoint.delete({ where: { id } });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'MEET_POINT_DELETED',
      entityType: 'MeetPoint',
      entityId: id,
      ip: ip ?? null,
    });
    return { ok: true };
  }

  async listChatScanRules() {
    return {
      items: await this.prisma.chatScanRule.findMany({
        orderBy: { createdAt: 'desc' },
      }),
    };
  }

  async createChatScanRule(
    actor: AuthUser,
    data: Prisma.ChatScanRuleCreateInput,
    ip?: string,
  ) {
    const row = await this.prisma.chatScanRule.create({ data });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'CHAT_SCAN_RULE_CREATED',
      entityType: 'ChatScanRule',
      entityId: row.id,
      ip: ip ?? null,
    });
    return row;
  }

  async updateChatScanRule(
    actor: AuthUser,
    id: string,
    data: Prisma.ChatScanRuleUpdateInput,
    ip?: string,
  ) {
    const row = await this.prisma.chatScanRule.update({ where: { id }, data });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'CHAT_SCAN_RULE_UPDATED',
      entityType: 'ChatScanRule',
      entityId: id,
      ip: ip ?? null,
    });
    return row;
  }

  async deleteChatScanRule(actor: AuthUser, id: string, ip?: string) {
    await this.prisma.chatScanRule.delete({ where: { id } });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'CHAT_SCAN_RULE_DELETED',
      entityType: 'ChatScanRule',
      entityId: id,
      ip: ip ?? null,
    });
    return { ok: true };
  }

  async listHeroBanners() {
    return {
      items: await this.prisma.heroBanner.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    };
  }

  async createHeroBanner(
    actor: AuthUser,
    dto: AdminHeroBannerDto,
    ip?: string,
  ) {
    const row = await this.prisma.heroBanner.create({
      data: {
        title: dto.title,
        body: dto.body,
        imageUrl: dto.imageUrl,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'HERO_BANNER_CREATED',
      entityType: 'HeroBanner',
      entityId: row.id,
      ip: ip ?? null,
    });
    return row;
  }

  async updateHeroBanner(
    actor: AuthUser,
    id: string,
    dto: Partial<AdminHeroBannerDto>,
    ip?: string,
  ) {
    const row = await this.prisma.heroBanner.update({
      where: { id },
      data: dto,
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'HERO_BANNER_UPDATED',
      entityType: 'HeroBanner',
      entityId: id,
      ip: ip ?? null,
    });
    return row;
  }

  async deleteHeroBanner(actor: AuthUser, id: string, ip?: string) {
    await this.prisma.heroBanner.delete({ where: { id } });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'HERO_BANNER_DELETED',
      entityType: 'HeroBanner',
      entityId: id,
      ip: ip ?? null,
    });
    return { ok: true };
  }

  async listCommunities() {
    return {
      items: await this.prisma.community.findMany({
        orderBy: { name: 'asc' },
      }),
    };
  }

  async createCommunity(
    actor: AuthUser,
    data: { slug: string; name: string; active?: boolean },
    ip?: string,
  ) {
    const row = await this.prisma.community.create({
      data: {
        slug: data.slug,
        name: data.name,
        active: data.active ?? true,
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'COMMUNITY_CREATED',
      entityType: 'Community',
      entityId: row.id,
      ip: ip ?? null,
    });
    return row;
  }

  async listPromotions() {
    return {
      items: await this.prisma.promotion.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { listing: { select: { title: true } } },
      }),
    };
  }

  async createPromotion(
    actor: AuthUser,
    dto: AdminPromotionCreateDto,
    ip?: string,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    const row = await this.prisma.promotion.create({
      data: {
        listingId: dto.listingId,
        kind: dto.kind,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        feeKobo: dto.feeKobo ?? 0,
        createdById: actor.id,
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'PROMOTION_CREATED',
      entityType: 'Promotion',
      entityId: row.id,
      ip: ip ?? null,
    });
    return row;
  }

  async analytics(from?: string, to?: string, community?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86_400_000);
    const toDate = to ? new Date(to) : new Date();
    const listingWhere: Prisma.ListingWhereInput = {
      createdAt: { gte: fromDate, lte: toDate },
      ...(community ? { community } : {}),
    };
    const orderWhere: Prisma.OrderWhereInput = {
      createdAt: { gte: fromDate, lte: toDate },
      ...(community ? { listing: { community } } : {}),
    };
    const [listings, orders, users] = await Promise.all([
      this.prisma.listing.count({ where: listingWhere }),
      this.prisma.order.findMany({
        where: orderWhere,
        select: { totalKobo: true, status: true, listing: { select: { community: true } } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: fromDate, lte: toDate } },
      }),
    ]);
    const gmvKobo = orders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((s, o) => s + o.totalKobo, 0);
    const rows = [
      { metric: 'new_users', value: users },
      { metric: 'new_listings', value: listings },
      { metric: 'orders', value: orders.length },
      { metric: 'gmv_kobo', value: gmvKobo },
    ];
    return { from: fromDate, to: toDate, community: community ?? null, rows };
  }

  async analyticsCsv(from?: string, to?: string, community?: string) {
    const data = await this.analytics(from, to, community);
    const header = 'metric,value';
    const lines = data.rows.map((r) => `${r.metric},${r.value}`);
    return [header, ...lines].join('\n');
  }

  async listAudit(actorId?: string, action?: string, cursor?: string) {
    const take = 50;
    const rows = await this.prisma.auditLog.findMany({
      where: {
        ...(actorId ? { actorUserId: actorId } : {}),
        ...(action ? { action } : {}),
      },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });
    const nextCursor = rows.length > take ? rows[take - 1]!.id : null;
    return { items: rows.slice(0, take), nextCursor };
  }
}
