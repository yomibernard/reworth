import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AppealStatus,
  ModerationOutcome,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  IMAGE_MODERATION_PROVIDER,
  type ImageModerationProvider,
} from './image-moderation.provider';

export type ModerationEvalResult = {
  outcome: ModerationOutcome;
  reasons: string[];
  detail: Record<string, unknown>;
};

/** Category slugs/names treated as prohibited for marketplace sell. */
const PROHIBITED_CATEGORY_PATTERNS = [
  /weapon/i,
  /firearm/i,
  /drug/i,
  /narcotic/i,
  /adult\s*content/i,
  /xxx/i,
  /wildlife.?trade/i,
  /counterfeit/i,
];

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(IMAGE_MODERATION_PROVIDER)
    private readonly images: ImageModerationProvider,
  ) {}

  async evaluateOnPublish(listingId: string): Promise<ModerationEvalResult> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        images: true,
        category: true,
        subcategory: true,
      },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const reasons: string[] = [];
    const detail: Record<string, unknown> = {};

    const keywords = await this.prisma.moderationKeyword.findMany({
      where: { enabled: true },
    });
    const blob = `${listing.title}\n${listing.description}`.toLowerCase();
    const keywordHits: Array<{ pattern: string; category: string }> = [];
    for (const kw of keywords) {
      if (blob.includes(kw.pattern.toLowerCase())) {
        keywordHits.push({ pattern: kw.pattern, category: kw.category });
        reasons.push(`KEYWORD:${kw.category}:${kw.pattern}`);
      }
    }
    detail.keywordHits = keywordHits;

    const metaFlags: string[] = [];
    for (const img of listing.images) {
      if (img.variants && typeof img.variants === 'object') {
        const v = img.variants as Record<string, unknown>;
        if (typeof v.moderationFlag === 'string') {
          metaFlags.push(v.moderationFlag);
        }
        if (Array.isArray(v.flags)) {
          metaFlags.push(
            ...v.flags.filter((f): f is string => typeof f === 'string'),
          );
        }
      }
    }

    const imageResult = await this.images.scan({
      listingId,
      imageKeys: listing.images.map((i) => i.originalKey),
      metaFlags,
    });
    detail.image = imageResult;
    if (imageResult.nsfw) {
      reasons.push(...imageResult.reasons);
    }

    const categoryBlob = [
      listing.category?.slug,
      listing.category?.name,
      listing.subcategory?.slug,
      listing.subcategory?.name,
    ]
      .filter(Boolean)
      .join(' ');
    if (
      categoryBlob &&
      PROHIBITED_CATEGORY_PATTERNS.some((re) => re.test(categoryBlob))
    ) {
      reasons.push('PROHIBITED_CATEGORY');
      detail.category = categoryBlob;
    }

    let outcome: ModerationOutcome = 'PASS';
    if (imageResult.nsfw || keywordHits.some((h) => h.category === 'adult')) {
      outcome = 'REJECTED';
    } else if (reasons.length > 0) {
      // Weapons/drugs/stolen etc → REJECTED; borderline → UNDER_REVIEW
      const hardReject = keywordHits.some((h) =>
        [
          'weapons',
          'drugs',
          'stolen',
          'wildlife',
          'body_parts',
          'financial_instruments',
        ].includes(h.category),
      );
      outcome = hardReject || reasons.includes('PROHIBITED_CATEGORY')
        ? 'REJECTED'
        : 'UNDER_REVIEW';
    }

    await this.prisma.moderationDecision.create({
      data: {
        listingId,
        outcome,
        reasons,
        detail: detail as Prisma.InputJsonValue,
      },
    });

    if (outcome === 'REJECTED') {
      await this.prisma.listing.update({
        where: { id: listingId },
        data: { status: 'REJECTED' },
      });
      await this.notifySeller(
        listing.sellerId,
        listingId,
        'Listing rejected',
        reasons.join('; ') || 'Your listing was rejected by content moderation.',
      );
    }

    this.logger.log({ listingId, outcome, reasons });
    return { outcome, reasons, detail };
  }

  async createAppeal(
    listingId: string,
    userId: string,
    reason: string,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can appeal');
    }
    if (listing.status !== 'REJECTED') {
      throw new BadRequestException('Only REJECTED listings can be appealed');
    }

    const open = await this.prisma.moderationAppeal.findFirst({
      where: { listingId, userId, status: 'OPEN' },
    });
    if (open) {
      throw new BadRequestException('An open appeal already exists');
    }

    return this.prisma.moderationAppeal.create({
      data: {
        listingId,
        userId,
        reason: reason.trim(),
        status: 'OPEN',
      },
    });
  }

  async listOpenAppeals() {
    const items = await this.prisma.moderationAppeal.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'asc' },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            status: true,
            sellerId: true,
          },
        },
        user: {
          select: {
            id: true,
            phone: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });
    return { items };
  }

  async resolveAppeal(
    appealId: string,
    reviewerId: string,
    status: AppealStatus,
    note?: string,
  ) {
    if (status !== 'APPROVED' && status !== 'DENIED') {
      throw new BadRequestException('status must be APPROVED or DENIED');
    }
    const appeal = await this.prisma.moderationAppeal.findUnique({
      where: { id: appealId },
    });
    if (!appeal) throw new NotFoundException('Appeal not found');
    if (appeal.status !== 'OPEN') {
      throw new BadRequestException('Appeal already resolved');
    }

    const updated = await this.prisma.moderationAppeal.update({
      where: { id: appealId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
      },
    });

    if (status === 'APPROVED') {
      await this.prisma.listing.update({
        where: { id: appeal.listingId },
        data: { status: 'UNDER_REVIEW' },
      });
    }

    if (note) {
      await this.prisma.moderationDecision.create({
        data: {
          listingId: appeal.listingId,
          outcome: status === 'APPROVED' ? 'UNDER_REVIEW' : 'REJECTED',
          reasons: [`APPEAL_${status}`, note],
          detail: { appealId, reviewerId } as Prisma.InputJsonValue,
        },
      });
    }

    await this.notifySeller(
      appeal.userId,
      appeal.listingId,
      status === 'APPROVED' ? 'Appeal approved' : 'Appeal denied',
      note ??
        (status === 'APPROVED'
          ? 'Your listing appeal was approved and is under review.'
          : 'Your listing appeal was denied.'),
    );

    return updated;
  }

  /** Test helper: scan text against keyword list without DB writes. */
  matchKeywords(
    text: string,
    keywords: Array<{ pattern: string; category: string }>,
  ): Array<{ pattern: string; category: string }> {
    const blob = text.toLowerCase();
    return keywords.filter((kw) => blob.includes(kw.pattern.toLowerCase()));
  }

  private async notifySeller(
    userId: string,
    listingId: string,
    title: string,
    body: string,
  ) {
    try {
      await this.notifications.notify({
        userId,
        category: 'VERIFICATION_UPDATE',
        title,
        body,
        deepLink: `/listings/${listingId}`,
        channels: ['IN_APP'],
      });
    } catch (err) {
      this.logger.warn({ err, userId }, 'Failed to notify seller about moderation');
    }
  }
}
