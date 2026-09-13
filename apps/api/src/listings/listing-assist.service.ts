import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AI_LISTING_PROVIDER,
  type AiListingProvider,
} from '../providers/ai-listing.provider';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class ListingAssistService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_LISTING_PROVIDER) private readonly ai: AiListingProvider,
    private readonly analytics: AnalyticsService,
  ) {}

  async assist(
    listingId: string,
    sellerId: string,
    opts?: { imageKeys?: string[] },
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { images: true, category: true },
    });
    if (!listing || listing.sellerId !== sellerId) {
      throw new NotFoundException('Listing not found');
    }

    const imageHints =
      opts?.imageKeys ??
      listing.images.map((i) => i.originalKey);

    const draft = await this.ai.draftListing({
      titleHint: listing.title || undefined,
      descriptionHint: listing.description || undefined,
      categoryHint: listing.category?.name,
      communityHint: listing.community || undefined,
      imageHints,
    });

    this.analytics.log('assist_shown', {
      listingId,
      provider: this.ai.name,
      title: draft.title,
    });

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        title: draft.title,
        description: draft.description,
        brand: draft.brand ?? listing.brand,
        model: draft.model ?? listing.model,
        condition: (draft.suggestedCondition as typeof listing.condition) || listing.condition,
        priceKobo: draft.suggestedPriceNaira * 100,
        aiUsed: true,
        aiEditedFields: [
          'title',
          'description',
          'condition',
          'priceKobo',
          ...(draft.brand ? ['brand'] : []),
          ...(draft.model ? ['model'] : []),
        ],
      },
    });

    // Best-effort category match by name
    if (draft.suggestedCategory) {
      const cat = await this.prisma.category.findFirst({
        where: {
          name: { equals: draft.suggestedCategory, mode: 'insensitive' },
          parentId: null,
        },
      });
      if (cat) {
        await this.prisma.listing.update({
          where: { id: listingId },
          data: { categoryId: cat.id },
        });
      }
    }

    return {
      draft,
      listing: updated,
    };
  }
}
