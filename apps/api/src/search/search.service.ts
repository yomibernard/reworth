import { Inject, Injectable } from '@nestjs/common';
import { CommunityVisibilityService } from '../communities/community-visibility.service';
import { PrismaService } from '../prisma/prisma.service';
import { DiscoveryAnalyticsService } from '../discovery/discovery-analytics.service';
import {
  SEARCH_PROVIDER,
  type SearchFilters,
  type SearchProvider,
  type SearchProviderResult,
} from '../providers/search.provider';
import { NlSearchParser } from './nl-search.parser';
import type { NlSearchDto, SearchQueryDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  private readonly nlParser = new NlSearchParser();

  constructor(
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: SearchProvider,
    private readonly prisma: PrismaService,
    private readonly analytics: DiscoveryAnalyticsService,
    private readonly visibility: CommunityVisibilityService,
  ) {}

  async search(
    query: SearchQueryDto,
    viewerId?: string | null,
  ): Promise<SearchProviderResult> {
    const filters = this.mapQuery(query, viewerId);
    const result = await this.searchProvider.search(filters);
    this.analytics.searchPerformed({
      q: filters.q,
      community: filters.community,
      radiusKm: filters.radiusKm,
      total: result.total,
      tookMs: result.tookMs,
      provider: this.searchProvider.name,
    });
    return result;
  }

  async searchNl(dto: NlSearchDto, viewerId?: string | null) {
    const interpreted = this.nlParser.parse(dto.query, {
      lat: dto.lat,
      lng: dto.lng,
    });

    const filters = await this.resolveCategorySlugs(interpreted.filters);
    filters.viewerId = viewerId;
    filters.visibilityWhere = this.visibility.visibleListingWhere(
      viewerId,
    ) as Record<string, unknown>;
    const results = await this.searchProvider.search(filters);

    this.analytics.nlSearchUsed({
      query: dto.query,
      chips: interpreted.chips,
      total: results.total,
    });
    this.analytics.searchPerformed({
      q: filters.q,
      community: filters.community,
      source: 'nl',
      total: results.total,
      tookMs: results.tookMs,
    });

    return {
      interpreted: {
        chips: interpreted.chips,
        filters,
      },
      results,
    };
  }

  /** Exposed for unit tests */
  parseNl(query: string, opts?: { lat?: number; lng?: number }) {
    return this.nlParser.parse(query, opts);
  }

  private mapQuery(
    query: SearchQueryDto,
    viewerId?: string | null,
  ): SearchFilters {
    return {
      q: query.q,
      categoryId: query.categoryId,
      subcategoryId: query.subcategoryId,
      priceMinKobo: query.priceMinKobo,
      priceMaxKobo: query.priceMaxKobo,
      condition: query.condition,
      community: query.community,
      communityId: query.communityId,
      city: query.city,
      radiusKm: query.radiusKm,
      lat: query.lat,
      lng: query.lng,
      verifiedOnly: query.verifiedOnly,
      deliveryAvailable: query.deliveryAvailable,
      listedAfter: query.listedAfter,
      sort: query.sort,
      cursor: query.cursor,
      limit: query.limit,
      viewerId,
      visibilityWhere: this.visibility.visibleListingWhere(
        viewerId,
      ) as Record<string, unknown>,
    };
  }

  private async resolveCategorySlugs(
    filters: SearchFilters & {
      categorySlug?: string;
      subcategorySlug?: string;
    },
  ): Promise<SearchFilters> {
    const { categorySlug, subcategorySlug, ...rest } = filters;
    const out: SearchFilters = { ...rest };

    if (categorySlug && !out.categoryId) {
      const cat = await this.prisma.category.findUnique({
        where: { slug: categorySlug },
      });
      if (cat) out.categoryId = cat.id;
    }
    if (subcategorySlug && !out.subcategoryId) {
      const sub = await this.prisma.category.findUnique({
        where: { slug: subcategorySlug },
      });
      if (sub) {
        out.subcategoryId = sub.id;
        if (!out.categoryId && sub.parentId) out.categoryId = sub.parentId;
      }
    }
    return out;
  }
}
