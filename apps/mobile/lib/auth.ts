import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_KEY = "rw_access_token";
const REFRESH_KEY = "rw_refresh_token";
const PHONE_KEY = "rw_onboarding_phone";

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function setTokens(accessToken: string, refreshToken: string) {
  await AsyncStorage.multiSet([
    [ACCESS_KEY, accessToken],
    [REFRESH_KEY, refreshToken],
  ]);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY, PHONE_KEY]);
}

export async function setOnboardingPhone(phone: string) {
  await AsyncStorage.setItem(PHONE_KEY, phone);
}

export async function getOnboardingPhone(): Promise<string | null> {
  return AsyncStorage.getItem(PHONE_KEY);
}

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
