/** Public brand image paths for the web companion (`apps/web/public/brand`). */

export const brandPublic = {
  logo: "/brand/logos/reworth-logo-primary.png",
  verifiedSeller: "/brand/trust/verified-seller.png",
  verified: "/brand/badges/verified.png",
  identityChecked: "/brand/trust/identity-checked.png",
  buyerProtection: "/brand/trust/buyer-protection.png",
  securePayment: "/brand/trust/secure-payment.png",
  safeMeetup: "/brand/trust/safe-meetup.png",
  trustedDelivery: "/brand/trust/trusted-delivery.png",
  movingSale: "/brand/social/moving-sale.png",
  profileAvatar: "/brand/social/profile-image.png",
  listingPlaceholder: "/brand/illustrations/listing-placeholder.png",
  onboarding: "/brand/onboarding/login-illustration.png",
  invite: "/brand/social/invite-someone.png",
  actionChat: "/brand/icons/action-chat.png",
  actionBuy: "/brand/icons/action-buy.png",
  actionLocation: "/brand/icons/action-location.png",
  actionOffer: "/brand/icons/action-make-offer.png",
  actionDelivery: "/brand/icons/action-delivery.png",
  actionSell: "/brand/icons/action-sell.png",
  actionSave: "/brand/icons/action-save.png",
  actionShare: "/brand/icons/action-share.png",
  statusDisputed: "/brand/badges/status-disputed.png",
} as const;

const CATEGORY_ICON: Record<string, string> = {
  appliances: "/brand/categories/appliances.png",
  "baby & kids": "/brand/categories/baby-kids.png",
  "baby and kids": "/brand/categories/baby-kids.png",
  kids: "/brand/categories/baby-kids.png",
  electronics: "/brand/categories/electronics.png",
  fashion: "/brand/categories/fashion.png",
  furniture: "/brand/categories/furniture.png",
  home: "/brand/categories/home-living.png",
  "home & living": "/brand/categories/home-living.png",
  luxury: "/brand/categories/luxury.png",
  other: "/brand/categories/others.png",
  others: "/brand/categories/others.png",
  phones: "/brand/categories/phones.png",
  sports: "/brand/categories/sports.png",
  vehicles: "/brand/categories/vehicles.png",
};

export function categoryBrandIcon(name: string): string | null {
  const key = name.trim().toLowerCase();
  return CATEGORY_ICON[key] ?? null;
}
