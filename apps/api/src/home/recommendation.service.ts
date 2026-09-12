import { Injectable } from '@nestjs/common';
import type { PublicListingDto } from '../listings/public-listing.mapper';

/** v1 popularity blend: views + saves weighted score. */
@Injectable()
export class RecommendationService {
  score(listing: {
    views: number;
    saves: number;
    publishedAt: Date | null;
    distanceKm?: number | null;
  }): number {
    const recencyBoost = listing.publishedAt
      ? Math.max(
          0,
          1 -
            (Date.now() - listing.publishedAt.getTime()) /
              (7 * 24 * 60 * 60 * 1000),
        )
      : 0;
    const distancePenalty =
      listing.distanceKm != null ? Math.min(listing.distanceKm / 25, 1) : 0.5;
    return (
      listing.views * 1 +
      listing.saves * 3 +
      recencyBoost * 10 -
      distancePenalty * 5
    );
  }

  rank(
    listings: Array<
      PublicListingDto & { views?: number; saves?: number; _score?: number }
    >,
    meta: Map<string, { views: number; saves: number; publishedAt: Date | null }>,
  ): PublicListingDto[] {
    return [...listings]
      .map((item) => {
        const m = meta.get(item.id) ?? {
          views: 0,
          saves: 0,
          publishedAt: item.publishedAt,
        };
        const _score = this.score({
          views: m.views,
          saves: m.saves,
          publishedAt: m.publishedAt,
          distanceKm: item.distanceKm,
        });
        return { item, _score };
      })
      .sort((a, b) => b._score - a._score)
      .map((x) => x.item);
  }
}
