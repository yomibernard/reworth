export enum ListingStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Live = "LIVE",
  Reserved = "RESERVED",
  Sold = "SOLD",
  Expired = "EXPIRED",
  Removed = "REMOVED",
  Rejected = "REJECTED",
}

export enum SellingMode {
  Sell = "SELL",
  Swap = "SWAP",
  SwapCash = "SWAP_CASH",
  GiveAway = "GIVE_AWAY",
}

export enum ItemCondition {
  New = "NEW",
  LikeNew = "LIKE_NEW",
  VeryGood = "VERY_GOOD",
  Good = "GOOD",
  Fair = "FAIR",
  ForParts = "FOR_PARTS",
}

export enum VerificationLevel {
  None = "NONE",
  Phone = "PHONE",
  Identity = "IDENTITY",
  Trusted = "TRUSTED",
}

/** Lagos community labels for local discovery. */
export enum CommunityLabel {
  LekkiPh1 = "LEKKI_PH1",
  Ikoyi = "IKOYI",
  VI = "VI",
  Oniru = "ONIRU",
  VGC = "VGC",
  Chevron = "CHEVRON",
  Ajah = "AJAH",
  OtherLagos = "OTHER_LAGOS",
}

export const COMMUNITY_LABEL_DISPLAY: Record<CommunityLabel, string> = {
  [CommunityLabel.LekkiPh1]: "Lekki Ph1",
  [CommunityLabel.Ikoyi]: "Ikoyi",
  [CommunityLabel.VI]: "VI",
  [CommunityLabel.Oniru]: "Oniru",
  [CommunityLabel.VGC]: "VGC",
  [CommunityLabel.Chevron]: "Chevron",
  [CommunityLabel.Ajah]: "Ajah",
  [CommunityLabel.OtherLagos]: "Other Lagos",
};

export enum AdminRole {
  SuperAdmin = "SUPER_ADMIN",
  Moderator = "MODERATOR",
  Support = "SUPPORT",
  Finance = "FINANCE",
  Ops = "OPS",
}
