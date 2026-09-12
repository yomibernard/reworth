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
