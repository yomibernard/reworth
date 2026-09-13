export type VerificationLevels = {
  L1_PHONE: boolean;
  L2_EMAIL: boolean;
  L3_IDENTITY: boolean;
};

export type MeProfile = {
  displayName: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  birthYear: number | null;
  preferredCommunity: string;
  language: string;
  currency: string;
  showFullName: boolean;
};

export type MeResponse = {
  id: string;
  phone: string | null;
  email: string | null;
  status: string;
  phoneVerifiedAt: string | null;
  emailVerifiedAt: string | null;
  profile: MeProfile | null;
  verificationLevels: VerificationLevels;
  identityVerifiedBadge: boolean;
  roles: string[];
  createdAt: string;
};

export type DeviceRow = {
  id: string;
  name: string;
  platform: string;
  lastSeenAt: string;
  createdAt: string;
};

export type OtpRequestResponse = {
  ok: boolean;
  expiresInSeconds: number;
  debugCode?: string;
};

export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

/** Matches API PublicListingDto (dates as ISO strings over JSON). */
export type PublicListingImage = {
  id: string;
  sortOrder: number;
  variants: {
    original?: string;
    w640?: { webp?: string; avif?: string };
    w1080?: { webp?: string; avif?: string };
    w1600?: { webp?: string; avif?: string };
    [key: string]: unknown;
  };
  width: number | null;
  height: number | null;
};

export type PublicListingSeller = {
  id: string;
  displayName: string;
  verificationBadge: boolean;
  ratingLabel: string;
  trustBadge?: "Top Seller" | "Trusted" | null;
  responseMinutes?: number | null;
};

export type SellingModeValue = "SELL" | "SWAP" | "SWAP_CASH" | "GIVE_AWAY";

export type ItemConditionValue =
  | "NEW"
  | "LIKE_NEW"
  | "VERY_GOOD"
  | "GOOD"
  | "FAIR"
  | "FOR_PARTS";

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
  sellingMode: SellingModeValue | string;
  status: string;
  community: string;
  geoLat: number | null;
  geoLng: number | null;
  distanceKm?: number | null;
  images: PublicListingImage[];
  seller: PublicListingSeller;
  fulfilmentPickup: boolean;
  fulfilmentMeet: boolean;
  fulfilmentDelivery: boolean;
  buyerProtection: true;
  createdAt: string;
  publishedAt: string | null;
  vehicle?: Record<string, unknown> | null;
};

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  iconUrl: string | null;
  children: Omit<CategoryNode, "children">[];
};

export type PresignMediaResponse = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
};

export type PriceIntelligence = {
  listingId: string;
  currency: string;
  estimatedLowKobo: number;
  estimatedHighKobo: number;
  recommendedKobo: number;
  estimatedLowNaira: number;
  estimatedHighNaira: number;
  recommendedNaira: number;
  basis: string;
};

export type AiListingDraft = {
  title: string;
  description: string;
  brand?: string;
  model?: string;
  suggestedCondition: string;
  suggestedCategory: string;
  suggestedPriceNaira: number;
  suggestedPriceLowNaira: number;
  suggestedPriceHighNaira: number;
  tags: string[];
};

export type AssistResponse = {
  draft: AiListingDraft;
  listing: PublicListing | Record<string, unknown>;
};

export type CreateListingBody = {
  title?: string;
  description?: string;
  categoryId?: string;
  subcategoryId?: string;
  brand?: string;
  model?: string;
  condition?: ItemConditionValue | string;
  ageText?: string;
  originalPriceKobo?: number;
  priceKobo?: number;
  negotiable?: boolean;
  sellingMode?: SellingModeValue | string;
  community?: string;
  fulfilmentPickup?: boolean;
  fulfilmentMeet?: boolean;
  fulfilmentDelivery?: boolean;
};

export type UpdateListingBody = CreateListingBody;

/** Phase 3 — Discovery */

export type RadiusKm = 2 | 5 | 10 | 25;

export type SearchSort = "newest" | "price_asc" | "price_desc" | "distance";

export type SearchFilters = {
  q?: string;
  categoryId?: string;
  subcategoryId?: string;
  priceMinKobo?: number;
  priceMaxKobo?: number;
  condition?: string;
  community?: string;
  radiusKm?: RadiusKm;
  lat?: number;
  lng?: number;
  verifiedOnly?: boolean;
  deliveryAvailable?: boolean;
  listedAfter?: string;
  sort?: SearchSort;
  cursor?: string;
  limit?: number;
};

export type SearchFacets = {
  categories: Array<{ id: string; slug: string; name: string; count: number }>;
  conditions: Array<{ value: string; count: number }>;
  communities: Array<{ value: string; count: number }>;
};

export type SearchResult = {
  items: PublicListing[];
  nextCursor?: string;
  facets: SearchFacets;
  tookMs: number;
  total: number;
};

export type NlInterpreted = {
  chips: string[];
  filters: SearchFilters;
};

export type NlSearchResponse = {
  interpreted: NlInterpreted;
  results: SearchResult;
};

export type HomeRail = {
  id: string;
  title: string;
  items: PublicListing[];
  emptyMessage?: string;
};

export type HomeResponse = {
  rails: HomeRail[];
  community?: string;
  radiusKm?: number;
};

export type FavouriteItem = {
  favouriteId: string;
  savedAt: string;
  listing: PublicListing;
};

export type FollowedSeller = {
  followId: string;
  followedAt: string;
  seller: {
    id: string;
    displayName: string;
    verificationBadge: boolean;
  };
};

export type SavedSearch = {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  newMatchesCount: number;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MeFavouritesResponse = {
  items: FavouriteItem[];
  sellers: FollowedSeller[];
  searches: SavedSearch[];
};
