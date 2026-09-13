/** Pure trust-score math (PRD §16) — unit-testable without Nest/Prisma. */

export const TRUST_WEIGHTS = {
  completion: 30,
  avgRating: 25,
  medianResponse: 15,
  cancellation: 10,
  dispute: 10,
  accountAge: 5,
  verification: 5,
} as const;

export type VerificationTier = 'L3_IDENTITY' | 'L2_EMAIL' | 'L1_PHONE' | null;

export type TrustScoreInputs = {
  completionRate: number;
  avgRating: number | null;
  medianResponseMinutes: number | null;
  cancellationRate: number;
  disputeRate: number;
  accountAgeDays: number;
  verificationLevel: VerificationTier;
};

export type TrustScoreComponents = {
  completion: number;
  avgRating: number;
  medianResponse: number;
  cancellation: number;
  dispute: number;
  accountAge: number;
  verification: number;
};

export type TrustScoreResult = {
  score: number;
  tier: 'TOP_SELLER' | 'TRUSTED' | null;
  components: TrustScoreComponents;
  verificationPoints: number;
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

/** Faster reply → higher component score. */
export function normalizeResponseMinutes(minutes: number | null): number {
  if (minutes == null) return 50;
  if (minutes <= 10) return 100;
  if (minutes <= 60) return 70;
  if (minutes <= 240) return 40;
  return 20;
}

export function verificationPoints(level: VerificationTier): number {
  if (level === 'L3_IDENTITY') return 100;
  if (level === 'L2_EMAIL') return 60;
  if (level === 'L1_PHONE') return 30;
  return 0;
}

export function tierFromScore(score: number): 'TOP_SELLER' | 'TRUSTED' | null {
  if (score >= 90) return 'TOP_SELLER';
  if (score >= 70) return 'TRUSTED';
  return null;
}

/** Public label — never expose raw score when below Trusted. */
export function publicTrustBadge(
  tier: string | null | undefined,
): 'Top Seller' | 'Trusted' | null {
  if (tier === 'TOP_SELLER') return 'Top Seller';
  if (tier === 'TRUSTED') return 'Trusted';
  return null;
}

export function computeTrustScore(inputs: TrustScoreInputs): TrustScoreResult {
  const completion = clamp(inputs.completionRate * 100);
  const avgRating =
    inputs.avgRating == null
      ? 50
      : clamp((inputs.avgRating / 5) * 100);
  const medianResponse = normalizeResponseMinutes(
    inputs.medianResponseMinutes,
  );
  const cancellation = clamp((1 - inputs.cancellationRate) * 100);
  const dispute = clamp((1 - inputs.disputeRate) * 100);
  const accountAge = clamp((inputs.accountAgeDays / 365) * 100);
  const verification = verificationPoints(inputs.verificationLevel);

  const components: TrustScoreComponents = {
    completion,
    avgRating,
    medianResponse,
    cancellation,
    dispute,
    accountAge,
    verification,
  };

  const weighted =
    (completion * TRUST_WEIGHTS.completion +
      avgRating * TRUST_WEIGHTS.avgRating +
      medianResponse * TRUST_WEIGHTS.medianResponse +
      cancellation * TRUST_WEIGHTS.cancellation +
      dispute * TRUST_WEIGHTS.dispute +
      accountAge * TRUST_WEIGHTS.accountAge +
      verification * TRUST_WEIGHTS.verification) /
    100;

  const score = Math.round(clamp(weighted));
  return {
    score,
    tier: tierFromScore(score),
    components,
    verificationPoints: verification,
  };
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}
