/**
 * Buyer protection fee: 2.5% of item amount, capped at ₦5,000 (500_000 kobo).
 */
export function computeProtectionFeeKobo(
  amountKobo: number,
  pct = 0.025,
  capKobo = 500_000,
): number {
  if (amountKobo < 0) throw new Error('amountKobo must be non-negative');
  return Math.min(Math.ceil(amountKobo * pct), capKobo);
}

export function computeOrderTotalKobo(input: {
  amountKobo: number;
  protectionFeeKobo: number;
  deliveryFeeKobo?: number;
}): number {
  return (
    input.amountKobo +
    input.protectionFeeKobo +
    (input.deliveryFeeKobo ?? 0)
  );
}
