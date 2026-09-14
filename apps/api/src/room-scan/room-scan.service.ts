import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { normalizeCity } from '../intelligence/city-scope';
import { AnalyticsService } from '../listings/analytics.service';
import { ListingsService } from '../listings/listings.service';
import {
  AI_LISTING_PROVIDER,
  type AiListingProvider,
} from '../providers/ai-listing.provider';
import { PrismaService } from '../prisma/prisma.service';
import {
  ROOM_SCAN_VISION_PROVIDER,
  type RoomScanVisionProvider,
} from './room-scan-vision.provider';

@Injectable()
export class RoomScanService {
  private readonly logger = new Logger(RoomScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly analytics: AnalyticsService,
    private readonly listings: ListingsService,
    @Inject(ROOM_SCAN_VISION_PROVIDER)
    private readonly vision: RoomScanVisionProvider,
    @Inject(AI_LISTING_PROVIDER) private readonly ai: AiListingProvider,
  ) {}

  maxPhotos(): number {
    return Number(this.config.get('ROOM_SCAN_MAX_PHOTOS') ?? 8);
  }

  async create(
    userId: string,
    photoKeys: string[],
    city?: string,
  ) {
    const max = this.maxPhotos();
    if (photoKeys.length > max) {
      throw new BadRequestException(`At most ${max} photos per room scan`);
    }
    const scan = await this.prisma.roomScan.create({
      data: {
        userId,
        city: normalizeCity(city),
        status: 'UPLOADED',
        photoKeys,
      },
      include: { items: true, drafts: true },
    });
    this.analytics.log('room_scan_created', {
      roomScanId: scan.id,
      userId,
      photoCount: photoKeys.length,
    });
    return scan;
  }

  async get(id: string, userId: string) {
    return this.requireOwner(id, userId);
  }

  /**
   * Run vision detect. Idempotent: if items already exist and status READY+,
   * return existing without duplicating.
   */
  async detect(id: string, userId: string) {
    const scan = await this.requireOwner(id, userId);
    if (
      scan.items.length > 0 &&
      (scan.status === 'READY' ||
        scan.status === 'DRAFTS_CREATED' ||
        scan.status === 'DETECTING')
    ) {
      return scan;
    }

    await this.prisma.roomScan.update({
      where: { id },
      data: { status: 'DETECTING', errorMessage: null },
    });

    try {
      const detections = await this.vision.detect(scan.photoKeys);
      await this.prisma.$transaction(async (tx) => {
        await tx.roomScanItem.deleteMany({ where: { roomScanId: id } });
        for (let i = 0; i < detections.length; i++) {
          const d = detections[i]!;
          await tx.roomScanItem.create({
            data: {
              roomScanId: id,
              label: d.label,
              brandHint: d.brandHint ?? null,
              categoryHint: d.categoryHint ?? null,
              cropKey: d.cropKey ?? null,
              bbox: (d.bbox ?? undefined) as Prisma.InputJsonValue,
              selected: true,
              condition: 'GOOD',
              sortOrder: i,
            },
          });
        }
        await tx.roomScan.update({
          where: { id },
          data: {
            status: 'READY',
            detections: detections as unknown as Prisma.InputJsonValue,
          },
        });
      });

      this.analytics.log('room_scan_detected', {
        roomScanId: id,
        count: detections.length,
      });
      return this.requireOwner(id, userId);
    } catch (err) {
      await this.prisma.roomScan.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorMessage: (err as Error).message,
        },
      });
      throw err;
    }
  }

  async patchItems(
    id: string,
    userId: string,
    items: Array<{ id: string; selected?: boolean; condition?: string }>,
  ) {
    await this.requireOwner(id, userId);
    for (const patch of items) {
      const existing = await this.prisma.roomScanItem.findUnique({
        where: { id: patch.id },
      });
      if (!existing || existing.roomScanId !== id) {
        throw new NotFoundException(`Item ${patch.id} not on this scan`);
      }
      await this.prisma.roomScanItem.update({
        where: { id: patch.id },
        data: {
          ...(patch.selected != null ? { selected: patch.selected } : {}),
          ...(patch.condition != null ? { condition: patch.condition } : {}),
        },
      });
    }
    return this.requireOwner(id, userId);
  }

  /**
   * Create DRAFT listings for selected items. Idempotent: will not duplicate
   * drafts for the same scan (returns existing drafts).
   */
  async createDrafts(id: string, userId: string) {
    const scan = await this.requireOwner(id, userId);
    if (scan.drafts.length > 0) {
      return {
        roomScan: scan,
        drafts: scan.drafts,
        idempotent: true,
      };
    }

    const selected = scan.items.filter((i) => i.selected);
    if (selected.length === 0) {
      throw new BadRequestException('No selected items to draft');
    }

    const batchId = randomUUID();
    const created: Array<{ id: string; listingId: string; itemLabel: string }> =
      [];

    for (const item of selected) {
      const draftAi = await this.ai.draftListing({
        titleHint: item.label,
        categoryHint: item.categoryHint ?? undefined,
        imageHints: item.cropKey ? [item.cropKey] : scan.photoKeys,
        communityHint: scan.city,
      });

      const listing = await this.listings.create(userId, {
        title: draftAi.title || item.label,
        description: draftAi.description,
        brand: item.brandHint ?? draftAi.brand,
        model: draftAi.model,
        condition: (item.condition as never) ?? 'GOOD',
        priceKobo: Math.round(draftAi.suggestedPriceNaira * 100),
        city: scan.city,
        community: scan.city === 'Lagos' ? 'LEKKI_PH1' : scan.city,
        negotiable: true,
        sellingMode: 'SELL',
      });

      if (item.cropKey) {
        try {
          await this.prisma.listingImage.create({
            data: {
              listingId: listing.id,
              originalKey: item.cropKey,
              sortOrder: 0,
              status: 'READY',
              variants: { thumb: item.cropKey },
            },
          });
        } catch (err) {
          this.logger.warn(
            `Failed to attach crop image: ${(err as Error).message}`,
          );
        }
      }

      const draftRow = await this.prisma.roomScanDraft.create({
        data: {
          roomScanId: id,
          listingId: listing.id,
          itemLabel: item.label,
        },
      });
      created.push(draftRow);
    }

    const updated = await this.prisma.roomScan.update({
      where: { id },
      data: { status: 'DRAFTS_CREATED', draftBatchId: batchId },
      include: { items: true, drafts: true },
    });

    this.analytics.log('room_scan_drafts_created', {
      roomScanId: id,
      count: created.length,
      batchId,
    });

    return { roomScan: updated, drafts: updated.drafts, idempotent: false };
  }

  async listDrafts(id: string, userId: string) {
    const scan = await this.requireOwner(id, userId);
    return scan.drafts;
  }

  async publish(id: string, userId: string, listingIds: string[]) {
    const scan = await this.requireOwner(id, userId);
    const allowed = new Set(scan.drafts.map((d) => d.listingId));
    const results = [];
    for (const listingId of listingIds) {
      if (!allowed.has(listingId)) {
        throw new BadRequestException(
          `Listing ${listingId} is not a draft from this room scan`,
        );
      }
      results.push(await this.listings.publish(listingId, userId));
    }
    this.analytics.log('room_scan_published', {
      roomScanId: id,
      count: results.length,
    });
    return { published: results };
  }

  private async requireOwner(id: string, userId: string) {
    const scan = await this.prisma.roomScan.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        drafts: true,
      },
    });
    if (!scan) throw new NotFoundException('Room scan not found');
    if (scan.userId !== userId) {
      throw new ForbiddenException('Not your room scan');
    }
    return scan;
  }
}
