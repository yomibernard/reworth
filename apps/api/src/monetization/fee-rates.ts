/**
 * Default monetization rates (kobo / bps). Versioned via FeeConfigVersion.
 */
export type FeeRates = {
  protectionFeePct: number;
  protectionFeeCapKobo: number;
  deliveryMarginPct: number;
  boost: {
    durationsHours: number[];
    priceByHoursKobo: Record<string, number>;
  };
  featured: {
    durationHours: number;
    priceKobo: number;
  };
  promoted: {
    priceKobo: number;
    durationHours: number;
  };
  sellerPlus: {
    monthlyKobo: number;
    maxActiveListings: number;
    featuredSlotsPerMonth: number;
    graceDays: number;
  };
  sellerStarter: {
    maxActiveListings: number;
  };
  inspectionMarginPct: number;
  authenticationMarginPct: number;
  consignmentFeeBps: number;
};

export const DEFAULT_FEE_RATES: FeeRates = {
  protectionFeePct: 0.025,
  protectionFeeCapKobo: 500_000,
  deliveryMarginPct: 0.15,
  boost: {
    durationsHours: [24, 72, 168],
    priceByHoursKobo: {
      '24': 150_000, // ₦1,500
      '72': 350_000, // ₦3,500
      '168': 750_000, // ₦7,500
    },
  },
  featured: {
    durationHours: 168,
    priceKobo: 2_500_000, // ₦25,000 / week
  },
  promoted: {
    priceKobo: 5_000_000,
    durationHours: 168,
  },
  sellerPlus: {
    monthlyKobo: 499_900, // ₦4,999
    maxActiveListings: 50,
    featuredSlotsPerMonth: 1,
    graceDays: 7,
  },
  sellerStarter: {
    maxActiveListings: 10,
  },
  inspectionMarginPct: 0.1,
  authenticationMarginPct: 0.1,
  consignmentFeeBps: 1_500,
};

export function parseFeeRates(raw: unknown): FeeRates {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_FEE_RATES };
  return { ...DEFAULT_FEE_RATES, ...(raw as Partial<FeeRates>) };
}

export function computeProtectionFeeKoboFromRates(
  amountKobo: number,
  rates: FeeRates,
): number {
  if (amountKobo < 0) throw new Error('amountKobo must be non-negative');
  return Math.min(
    Math.ceil(amountKobo * rates.protectionFeePct),
    rates.protectionFeeCapKobo,
  );
}

export function computeDeliveryMarginKobo(
  deliveryFeeKobo: number,
  rates: FeeRates,
): number {
  if (deliveryFeeKobo <= 0) return 0;
  return Math.floor(deliveryFeeKobo * rates.deliveryMarginPct);
}

export function computePartnerMarginKobo(
  partnerCostKobo: number,
  marginPct: number,
): { grossKobo: number; netKobo: number } {
  const netKobo = Math.floor(partnerCostKobo * marginPct);
  return { grossKobo: partnerCostKobo + netKobo, netKobo };
}
