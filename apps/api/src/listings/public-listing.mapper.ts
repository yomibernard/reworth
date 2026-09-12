/**
 * Public listing DTO — privacy-critical.
 * NEVER include addressPrivate, address, line1, seller phone/email, or vehicle.vin.
 */

export type PublicListingImage = {
  id: string;
  sortOrder: number;
  variants: Record<string, unknown>;
  width: number | null;
  height: number | null;
};

export type PublicListingSeller = {
  id: string;
  displayName: string;
  verificationBadge: boolean;
  ratingLabel: string;
};

export type PublicListingDto = {
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
  geoLat: number | null;
  geoLng: number | null;
  distanceKm?: number | null;
  images: PublicListingImage[];
  seller: PublicListingSeller;
  fulfilmentPickup: boolean;
  fulfilmentMeet: boolean;
  fulfilmentDelivery: boolean;
  buyerProtection: true;
  createdAt: Date;
  publishedAt: Date | null;
  vehicle?: Record<string, unknown> | null;
};

type ListingWithRelations = {
  id: string;
  title: string;
  description: string;
  brand: string | null;
  model: string | null;
  condition: string;
  priceKobo: number;
  negotiable: boolean;
  sellingMode: string;
  status: string;
  community: string;
  geoLat: number | null;
  geoLng: number | null;
  fulfilmentPickup: boolean;
  fulfilmentMeet: boolean;
  fulfilmentDelivery: boolean;
  createdAt: Date;
  publishedAt: Date | null;
  vehicle: unknown;
  addressPrivate?: string | null;
  category?: { id: string; slug: string; name: string } | null;
  images?: Array<{
    id: string;
    sortOrder: number;
    variants: unknown;
    width: number | null;
    height: number | null;
    status?: string;
  }>;
  seller?: {
    id: string;
    phone?: string | null;
    email?: string | null;
    profile?: { displayName: string } | null;
    verifications?: Array<{ level: string; status: string }>;
  };
};

function stripVehicleVin(vehicle: unknown): Record<string, unknown> | null {
  if (!vehicle || typeof vehicle !== 'object') return null;
  const copy = { ...(vehicle as Record<string, unknown>) };
  delete copy.vin;
  delete copy.VIN;
  delete copy.Vin;
  return copy;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function toPublicListing(
  listing: ListingWithRelations,
  opts?: { viewerLat?: number; viewerLng?: number },
): PublicListingDto {
  const seller = listing.seller;
  const verified = Boolean(
    seller?.verifications?.some(
      (v) => v.level === 'L3_IDENTITY' && v.status === 'VERIFIED',
    ),
  );

  let distanceKm: number | null | undefined;
  if (
    opts?.viewerLat != null &&
    opts?.viewerLng != null &&
    listing.geoLat != null &&
    listing.geoLng != null
  ) {
    distanceKm = Math.round(
      haversineKm(opts.viewerLat, opts.viewerLng, listing.geoLat, listing.geoLng) *
        10,
    ) / 10;
  }

  const images = (listing.images ?? [])
    .filter((img) => !img.status || img.status === 'READY')
    .map((img) => ({
      id: img.id,
      sortOrder: img.sortOrder,
      variants: (img.variants as Record<string, unknown>) ?? {},
      width: img.width,
      height: img.height,
    }));

  const dto: PublicListingDto = {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    category: listing.category
      ? {
          id: listing.category.id,
          slug: listing.category.slug,
          name: listing.category.name,
        }
      : null,
    brand: listing.brand,
    model: listing.model,
    condition: listing.condition,
    priceKobo: listing.priceKobo,
    negotiable: listing.negotiable,
    sellingMode: listing.sellingMode,
    status: listing.status,
    community: listing.community,
    geoLat: listing.geoLat,
    geoLng: listing.geoLng,
    distanceKm,
    images,
    seller: {
      id: seller?.id ?? '',
      displayName: seller?.profile?.displayName ?? 'Seller',
      verificationBadge: verified,
      ratingLabel: 'New',
    },
    fulfilmentPickup: listing.fulfilmentPickup,
    fulfilmentMeet: listing.fulfilmentMeet,
    fulfilmentDelivery: listing.fulfilmentDelivery,
    buyerProtection: true,
    createdAt: listing.createdAt,
    publishedAt: listing.publishedAt,
    vehicle: stripVehicleVin(listing.vehicle),
  };

  // Hard privacy guarantee — strip any accidental private keys
  const forbidden = [
    'addressPrivate',
    'address',
    'line1',
    'line2',
    'phone',
    'email',
    'passwordHash',
  ];
  for (const key of forbidden) {
    delete (dto as Record<string, unknown>)[key];
  }
  if (dto.seller) {
    delete (dto.seller as Record<string, unknown>).phone;
    delete (dto.seller as Record<string, unknown>).email;
  }

  return dto;
}
