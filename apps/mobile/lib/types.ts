export const COMMUNITIES = [
  "Lekki Ph1",
  "Ikoyi",
  "VI",
  "Oniru",
  "VGC",
  "Chevron",
  "Ajah",
  "Other Lagos",
] as const;

export type Community = (typeof COMMUNITIES)[number];

export type MeResponse = {
  id: string;
  phone: string | null;
  email: string | null;
  profile: {
    displayName: string;
    preferredCommunity: string;
  } | null;
  verificationLevels: {
    L1_PHONE: boolean;
    L2_EMAIL: boolean;
    L3_IDENTITY: boolean;
  };
  identityVerifiedBadge: boolean;
};

export type PublicListingImage = {
  id: string;
  sortOrder: number;
  variants: Record<string, unknown>;
  width: number | null;
  height: number | null;
};

export type PublicListing = {
  id: string;
  title: string;
  description: string;
  category: { id: string; slug: string; name: string } | null;
  brand: string | null;
  model: string | null;
  condition: string;
  priceKobo: number;
  negotiable: boolean;
  sellingMode: string;
  status: string;
  community: string;
  communityId?: string | null;
  communityOnly?: boolean;
  communityChip?: {
    id: string;
    slug: string;
    name: string;
    privacy: string;
  } | null;
  movingSale?: {
    id: string;
    title: string;
    deadline: string;
    status: string;
  } | null;
  images: PublicListingImage[];
  seller: {
    id: string;
    displayName: string;
    verificationBadge: boolean;
    ratingLabel: string;
    trustBadge?: "Top Seller" | "Trusted" | null;
    responseMinutes?: number | null;
  };
  fulfilmentPickup: boolean;
  fulfilmentMeet: boolean;
  fulfilmentDelivery: boolean;
  buyerProtection: true;
  createdAt: string;
  publishedAt: string | null;
};

export type PriceIntelligence = {
  estimatedLowKobo: number;
  estimatedHighKobo: number;
  recommendedKobo: number;
};

export type SellingModeValue = "SELL" | "SWAP" | "GIVE_AWAY";

export function formatNgnFromKobo(kobo: number): string {
  const naira = kobo / 100;
  return `₦${Math.round(naira).toLocaleString("en-NG")}`;
}

export function listingImageUrl(
  image: PublicListingImage | undefined,
): string | null {
  if (!image?.variants) return null;
  const v = image.variants as {
    original?: string;
    w640?: { webp?: string };
    w1080?: { webp?: string };
  };
  return v.w1080?.webp ?? v.w640?.webp ?? v.original ?? null;
}
