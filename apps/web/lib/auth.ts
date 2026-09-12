/**
 * Phase 1 interim auth storage — localStorage (document as non-httpOnly).
 * Replace with httpOnly cookies / BFF before production hardening.
 */

const ACCESS_KEY = "rw_access_token";
const REFRESH_KEY = "rw_refresh_token";
const PHONE_KEY = "rw_onboarding_phone";

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(tokens: TokenPair): void {
  if (!canUseStorage()) return;
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function setOnboardingPhone(phone: string): void {
  if (!canUseStorage()) return;
  sessionStorage.setItem(PHONE_KEY, phone);
}

export function getOnboardingPhone(): string | null {
  if (!canUseStorage()) return null;
  return sessionStorage.getItem(PHONE_KEY);
}

export function clearOnboardingPhone(): void {
  if (!canUseStorage()) return;
  sessionStorage.removeItem(PHONE_KEY);
}

/** Normalize NG phone toward E.164 (+234…). */
export function normalizeNgPhone(input: string): string {
  const trimmed = input.trim().replace(/[\s()-]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("234")) return `+${trimmed}`;
  if (trimmed.startsWith("0") && trimmed.length === 11) {
    return `+234${trimmed.slice(1)}`;
  }
  if (/^\d{10}$/.test(trimmed)) return `+234${trimmed}`;
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

export function isValidNgPhone(phone: string): boolean {
  return /^\+234\d{10}$/.test(phone);
}
