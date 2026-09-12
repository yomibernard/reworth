/**
 * Phase 1 interim admin session — localStorage.
 * Prefer httpOnly cookies before production.
 */

const ACCESS_KEY = "rw_admin_access";
const REFRESH_KEY = "rw_admin_refresh";
const ROLES_KEY = "rw_admin_roles";
const EMAIL_KEY = "rw_admin_email";

export type AdminSession = {
  accessToken: string;
  refreshToken: string;
  roles: string[];
  email: string;
};

function canUse(): boolean {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!canUse()) return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRoles(): string[] {
  if (!canUse()) return [];
  try {
    const raw = localStorage.getItem(ROLES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function getEmail(): string | null {
  if (!canUse()) return null;
  return localStorage.getItem(EMAIL_KEY);
}

export function setSession(session: AdminSession): void {
  if (!canUse()) return;
  localStorage.setItem(ACCESS_KEY, session.accessToken);
  localStorage.setItem(REFRESH_KEY, session.refreshToken);
  localStorage.setItem(ROLES_KEY, JSON.stringify(session.roles));
  localStorage.setItem(EMAIL_KEY, session.email);
}

export function clearSession(): void {
  if (!canUse()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ROLES_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export function isAuthed(): boolean {
  return Boolean(getAccessToken());
}

/** Decode JWT payload (roles live on access token). */
export function rolesFromAccessToken(token: string): string[] {
  try {
    const part = token.split(".")[1];
    if (!part) return [];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { roles?: string[] };
    return Array.isArray(payload.roles) ? payload.roles : [];
  } catch {
    return [];
  }
}

export function canSeeFinance(roles: string[]): boolean {
  return roles.includes("FINANCE") || roles.includes("SUPER_ADMIN");
}
