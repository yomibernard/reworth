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
