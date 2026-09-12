import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ListingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  GEOCODING_PROVIDER,
  type GeocodingProvider,
} from '../providers/geocoding.provider';
import { MediaService } from '../media/media.service';
import { FavouritesService } from '../favourites/favourites.service';
import { AnalyticsService } from './analytics.service';
import { FraudRulesService } from './fraud-rules.service';
import { ListingAssistService } from './listing-assist.service';
import { ListingStateMachine } from './listing-state.machine';
import { PriceIntelligenceService } from './price-intelligence.service';
import { toPublicListing } from './public-listing.mapper';
import type {
  AttachImagesDto,
  BrowseListingsQueryDto,
  CreateListingDto,
  ReportListingDto,
  UpdateListingDto,
} from './dto/listings.dto';

const PUBLIC_STATUSES: ListingStatus[] = ['LIVE', 'RESERVED'];

const listingInclude = {
  category: true,
  subcategory: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  seller: {
    include: {
      profile: true,
      verifications: true,
    },
  },
} satisfies Prisma.ListingInclude;

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly analytics: AnalyticsService,
    private readonly fraud: FraudRulesService,
    private readonly assistService: ListingAssistService,
    private readonly priceIntel: PriceIntelligenceService,
    private readonly media: MediaService,
    @Inject(GEOCODING_PROVIDER) private readonly geo: GeocodingProvider,
    @Optional()
    @Inject(forwardRef(() => FavouritesService))
    private readonly favourites?: FavouritesService,
  ) {}

  async listCategories() {
    const cats = await this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return cats.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      sortOrder: c.sortOrder,
      iconUrl: c.iconUrl,
      children: c.children.map((ch) => ({
        id: ch.id,
        slug: ch.slug,
        name: ch.name,
        sortOrder: ch.sortOrder,
        iconUrl: ch.iconUrl,
      })),
    }));
  }

  async create(sellerId: string, dto: CreateListingDto) {
    let geoLat = dto.geoLat;
    let geoLng = dto.geoLng;
    if (dto.community && (geoLat == null || geoLng == null)) {
      const g = await this.geo.geocodeCommunity(dto.community);
      if (g) {
        geoLat = geoLat ?? g.geoLat;
        geoLng = geoLng ?? g.geoLng;
      }
    }

    const listing = await this.prisma.listing.create({
      data: {
        sellerId,
        title: dto.title ?? '',
        description: dto.description ?? '',
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        brand: dto.brand,
        model: dto.model,
        condition: dto.condition ?? 'GOOD',
        ageText: dto.ageText,
        originalPriceKobo: dto.originalPriceKobo,
        priceKobo: dto.priceKobo ?? 0,
        negotiable: dto.negotiable ?? true,
        sellingMode: dto.sellingMode ?? 'SELL',
        status: 'DRAFT',
        community: dto.community ?? '',
        geoLat,
        geoLng,
        addressPrivate: dto.addressPrivate,
        fulfilmentPickup: dto.fulfilmentPickup ?? true,
        fulfilmentMeet: dto.fulfilmentMeet ?? true,
        fulfilmentDelivery: dto.fulfilmentDelivery ?? false,
        vehicle: dto.vehicle ? (dto.vehicle as Prisma.InputJsonValue) : undefined,
      },
      include: listingInclude,
    });

    this.analytics.log('listing_started', {
      listingId: listing.id,
      sellerId,
    });

    return toPublicListing(listing);
  }

  async browse(query: BrowseListingsQueryDto) {
    const status = (query.status as ListingStatus) || 'LIVE';
    const where: Prisma.ListingWhereInput = {
      status: status === 'LIVE' ? { in: PUBLIC_STATUSES } : status,
    };
    if (query.community) where.community = query.community;
    if (query.categoryId) where.categoryId = query.categoryId;

    const rows = await this.prisma.listing.findMany({
      where,
      include: listingInclude,
      orderBy: { publishedAt: 'desc' },
      take: Math.min(query.limit ?? 50, 100),
    });

    let filtered = rows;
    if (
      query.radiusKm != null &&
      query.lat != null &&
      query.lng != null
    ) {
      filtered = rows.filter((r) => {
        if (r.geoLat == null || r.geoLng == null) return false;
        const dto = toPublicListing(r, {
          viewerLat: query.lat,
          viewerLng: query.lng,
        });
        return (dto.distanceKm ?? Infinity) <= query.radiusKm!;
      });
    }

    return filtered.map((r) =>
      toPublicListing(r, { viewerLat: query.lat, viewerLng: query.lng }),
    );
  }

  async getById(id: string, viewerId?: string | null) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: listingInclude,
    });
    if (!listing) throw new NotFoundException('Listing not found');

    const isOwner = viewerId && listing.sellerId === viewerId;
    const isPublic = PUBLIC_STATUSES.includes(listing.status);
    if (!isPublic && !isOwner) {
      throw new NotFoundException('Listing not found');
    }

    if (isPublic) {
      await this.prisma.listing.update({
        where: { id },
        data: { views: { increment: 1 } },
      });
      await this.prisma.listingEvent.create({
        data: {
          listingId: id,
          type: 'VIEWED',
          actorUserId: viewerId ?? null,
        },
      });
    }

    return toPublicListing(listing);
  }

  async update(id: string, sellerId: string, dto: UpdateListingDto) {
    const listing = await this.requireOwner(id, sellerId);
    const priceChanged =
      dto.priceKobo !== undefined && dto.priceKobo !== listing.priceKobo;

    const updated = await this.prisma.listing.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.subcategoryId !== undefined
          ? { subcategoryId: dto.subcategoryId }
          : {}),
        ...(dto.brand !== undefined ? { brand: dto.brand } : {}),
        ...(dto.model !== undefined ? { model: dto.model } : {}),
        ...(dto.condition !== undefined ? { condition: dto.condition } : {}),
        ...(dto.ageText !== undefined ? { ageText: dto.ageText } : {}),
        ...(dto.originalPriceKobo !== undefined
          ? { originalPriceKobo: dto.originalPriceKobo }
          : {}),
        ...(dto.priceKobo !== undefined ? { priceKobo: dto.priceKobo } : {}),
        ...(dto.negotiable !== undefined ? { negotiable: dto.negotiable } : {}),
        ...(dto.sellingMode !== undefined
          ? { sellingMode: dto.sellingMode }
          : {}),
        ...(dto.community !== undefined ? { community: dto.community } : {}),
        ...(dto.geoLat !== undefined ? { geoLat: dto.geoLat } : {}),
        ...(dto.geoLng !== undefined ? { geoLng: dto.geoLng } : {}),
        ...(dto.addressPrivate !== undefined
          ? { addressPrivate: dto.addressPrivate }
          : {}),
        ...(dto.fulfilmentPickup !== undefined
          ? { fulfilmentPickup: dto.fulfilmentPickup }
          : {}),
        ...(dto.fulfilmentMeet !== undefined
          ? { fulfilmentMeet: dto.fulfilmentMeet }
          : {}),
        ...(dto.fulfilmentDelivery !== undefined
          ? { fulfilmentDelivery: dto.fulfilmentDelivery }
          : {}),
        ...(dto.vehicle !== undefined
          ? { vehicle: dto.vehicle as Prisma.InputJsonValue }
          : {}),
      },
      include: listingInclude,
    });

    if (priceChanged) {
      this.analytics.log('price_set', {
        listingId: id,
        priceKobo: dto.priceKobo,
      });
      await this.prisma.listingEvent.create({
        data: {
          listingId: id,
          type: 'PRICE_CHANGED',
          actorUserId: sellerId,
          payload: {
            from: listing.priceKobo,
            to: dto.priceKobo,
          },
        },
      });
    }

    if (listing.aiUsed && dto) {
      const edited = Object.keys(dto);
      if (edited.length) {
        this.analytics.log('assist_edited_fields', {
          listingId: id,
          fields: edited,
        });
      }
    }

    return toPublicListing(updated);
  }

  async softRemove(id: string, sellerId: string) {
    const listing = await this.requireOwner(id, sellerId);
    ListingStateMachine.assertTransition(listing.status, 'REMOVED');
    const updated = await this.prisma.listing.update({
      where: { id },
      data: { status: 'REMOVED' },
      include: listingInclude,
    });
    await this.emitStatus(id, sellerId, listing.status, 'REMOVED');
    return toPublicListing(updated);
  }

  async assist(
    id: string,
    sellerId: string,
    body?: { imageKeys?: string[] },
  ) {
    return this.assistService.assist(id, sellerId, body);
  }

  async publish(id: string, sellerId: string) {
    const listing = await this.requireOwner(id, sellerId);
    const startedAt = listing.createdAt.getTime();

    const risk = await this.fraud.evaluateListing(id);
    for (const ev of risk.riskEvents) {
      await this.prisma.riskEvent.create({
        data: {
          userId: sellerId,
          listingId: id,
          kind: ev.kind,
          score: ev.score,
          detail: ev.detail as Prisma.InputJsonValue,
        },
      });
    }

    const target: ListingStatus = risk.forceUnderReview
      ? 'UNDER_REVIEW'
      : 'LIVE';

    ListingStateMachine.assertTransition(listing.status, target);

    const expiryDays = Number(
      this.config.get<string>('LISTING_EXPIRY_DAYS') ?? '7',
    );
    const publishedAt = new Date();
    const expiresAt =
      target === 'LIVE'
        ? new Date(publishedAt.getTime() + expiryDays * 24 * 60 * 60 * 1000)
        : null;

    const updated = await this.prisma.listing.update({
      where: { id },
      data: {
        status: target,
        publishedAt: target === 'LIVE' ? publishedAt : listing.publishedAt,
        expiresAt: target === 'LIVE' ? expiresAt : listing.expiresAt,
        riskFlags: risk.flags,
      },
      include: listingInclude,
    });

    await this.emitStatus(id, sellerId, listing.status, target);

    // UNDER_REVIEW can auto-promote later; for Phase 2 if no risk we go LIVE.
    // If under review with no admin, leave as UNDER_REVIEW.

    if (target === 'LIVE' && this.favourites) {
      await this.favourites.onListingLive(updated).catch(() => undefined);
    }

    this.analytics.log('published', {
      listingId: id,
      status: target,
      riskFlags: risk.flags,
    });
    this.analytics.log('publish_duration_ms', {
      listingId: id,
      ms: Date.now() - startedAt,
    });

    return toPublicListing(updated);
  }

  async attachImages(id: string, sellerId: string, dto: AttachImagesDto) {
    await this.requireOwner(id, sellerId);
    this.analytics.log('photos_taken', {
      listingId: id,
      count: dto.images.length,
    });
    const images = await this.media.attachKeys(
      sellerId,
      id,
      dto.images.map((i) => ({ key: i.key, sortOrder: i.sortOrder })),
    );
    const listing = await this.prisma.listing.findUniqueOrThrow({
      where: { id },
      include: listingInclude,
    });
    return { images, listing: toPublicListing(listing) };
  }

  async priceIntelligence(id: string) {
    return this.priceIntel.getForListing(id);
  }

  async report(id: string, reporterId: string, dto: ReportListingDto) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    return this.prisma.report.create({
      data: {
        listingId: id,
        reporterId,
        reason: dto.reason,
        detail: dto.detail,
        status: 'OPEN',
      },
    });
  }

  private async requireOwner(id: string, sellerId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('Not the listing owner');
    }
    return listing;
  }

  private async emitStatus(
    listingId: string,
    actorUserId: string | null,
    from: ListingStatus,
    to: ListingStatus,
  ) {
    await this.prisma.listingEvent.create({
      data: {
        listingId,
        type: 'STATUS_CHANGED',
        actorUserId,
        payload: { from, to },
      },
    });
  }
}
