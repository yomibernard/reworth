import type { PublicListingDto } from '../listings/public-listing.mapper';

/**
 * ADR note — Recommendations provider (Phase 2.3 / ADR-pending):
 * RecProvider is the pluggable ranking surface for personalization experiments.
 * WeightedRecProviderV2 is the treatment; RecommendationService v1 popularity
 * remains control / anonymous fallback. City is a HARD filter (no cross-city).
 * See docs/EXPERIMENTS.md (written separately) and experiment key `rec_home_v2`.
 */
export type RecSurface = 'home' | 'similar' | 'post_checkout';

export type RecContext = {
  userId?: string | null;
  city: string;
  seed?: string | number;
  listingId?: string;
  limit: number;
  surface: RecSurface;
};

export interface RecProvider {
  recommend(ctx: RecContext): Promise<PublicListingDto[]>;
}

export const REC_PROVIDER = Symbol('REC_PROVIDER');

/** Deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
