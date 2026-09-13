export type ValuationBasis = 'sold_data' | 'live_listings_fallback' | 'rule_based_mock';

export type ValuationResult = {
  listingId: string;
  currency: 'NGN';
  city: string;
  estimatedLowKobo: number;
  estimatedHighKobo: number;
  recommendedKobo: number;
  quickSaleKobo: number;
  maxValueKobo: number;
  estimatedLowNaira: number;
  estimatedHighNaira: number;
  recommendedNaira: number;
  quickSaleNaira: number;
  maxValueNaira: number;
  confidenceLabel: string;
  sampleCount: number;
  basis: ValuationBasis;
};

export type ValuationListingInput = {
  id: string;
  city: string;
  categoryId: string | null;
  brand: string | null;
  condition: string;
  priceKobo: number;
  title: string;
  model: string | null;
  originalPriceKobo: number | null;
};

export interface ValuationProvider {
  value(listing: ValuationListingInput): Promise<ValuationResult>;
}

export const VALUATION_PROVIDER = Symbol('VALUATION_PROVIDER');

/** Percentile of sorted ascending values (linear interpolation). */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0]!;
  const idx = (p / 100) * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo]!;
  const w = idx - lo;
  return Math.round(sortedAsc[lo]! * (1 - w) + sortedAsc[hi]! * w);
}

/**
 * Mean absolute error in kobo — documented target helper for valuation refresh.
 * Target: MAE should trend down as sold comps grow (Phase 2.3 acceptance).
 */
export function meanAbsoluteErrorKobo(
  actuals: number[],
  predictions: number[],
): number {
  const n = Math.min(actuals.length, predictions.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += Math.abs(actuals[i]! - predictions[i]!);
  }
  return sum / n;
}
