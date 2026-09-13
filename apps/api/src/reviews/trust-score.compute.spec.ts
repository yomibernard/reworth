import {
  computeTrustScore,
  publicTrustBadge,
  type TrustScoreInputs,
} from './trust-score.compute';

describe('computeTrustScore weights', () => {
  const base = (over: Partial<TrustScoreInputs> = {}): TrustScoreInputs => ({
    completionRate: 1,
    avgRating: 5,
    medianResponseMinutes: 5,
    cancellationRate: 0,
    disputeRate: 0,
    accountAgeDays: 365,
    verificationLevel: 'L3_IDENTITY',
    ...over,
  });

  it('fixture A — elite seller → TOP_SELLER (~100)', () => {
    const r = computeTrustScore(base());
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.tier).toBe('TOP_SELLER');
    expect(publicTrustBadge(r.tier)).toBe('Top Seller');
  });

  it('fixture B — strong mid → TRUSTED', () => {
    const r = computeTrustScore(
      base({
        completionRate: 0.85,
        avgRating: 4.2,
        medianResponseMinutes: 45,
        cancellationRate: 0.1,
        disputeRate: 0.05,
        accountAgeDays: 180,
        verificationLevel: 'L2_EMAIL',
      }),
    );
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.score).toBeLessThan(90);
    expect(r.tier).toBe('TRUSTED');
    expect(publicTrustBadge(r.tier)).toBe('Trusted');
  });

  it('fixture C — weak signals → no public tier', () => {
    const r = computeTrustScore(
      base({
        completionRate: 0.4,
        avgRating: 2.5,
        medianResponseMinutes: 500,
        cancellationRate: 0.5,
        disputeRate: 0.4,
        accountAgeDays: 10,
        verificationLevel: null,
      }),
    );
    expect(r.score).toBeLessThan(70);
    expect(r.tier).toBeNull();
    expect(publicTrustBadge(r.tier)).toBeNull();
  });

  it('fixture D — response-time bands affect component', () => {
    const fast = computeTrustScore(base({ medianResponseMinutes: 8 }));
    const slow = computeTrustScore(base({ medianResponseMinutes: 300 }));
    expect(fast.components.medianResponse).toBe(100);
    expect(slow.components.medianResponse).toBe(20);
    expect(fast.score).toBeGreaterThan(slow.score);
  });

  it('fixture E — verification ladder L1/L2/L3', () => {
    const l3 = computeTrustScore(base({ verificationLevel: 'L3_IDENTITY' }));
    const l2 = computeTrustScore(base({ verificationLevel: 'L2_EMAIL' }));
    const l1 = computeTrustScore(base({ verificationLevel: 'L1_PHONE' }));
    const none = computeTrustScore(base({ verificationLevel: null }));
    expect(l3.verificationPoints).toBe(100);
    expect(l2.verificationPoints).toBe(60);
    expect(l1.verificationPoints).toBe(30);
    expect(none.verificationPoints).toBe(0);
    expect(l3.score).toBeGreaterThan(l2.score);
    expect(l2.score).toBeGreaterThan(l1.score);
    expect(l1.score).toBeGreaterThan(none.score);
  });
});
