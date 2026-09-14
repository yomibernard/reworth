/**
 * Phase 8 admin session — localStorage (prefer httpOnly cookies before prod).
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

export function hasAnyRole(roles: string[], allowed: readonly string[]): boolean {
  if (roles.includes("SUPER_ADMIN")) return true;
  return allowed.some((r) => roles.includes(r));
}

export function canSeeFinance(roles: string[]): boolean {
  return hasAnyRole(roles, ["FINANCE"]);
}

export const NAV_ROLES = {
  dashboard: [
    "SUPER_ADMIN",
    "OPERATIONS",
    "FINANCE",
    "CUSTOMER_SUPPORT",
    "RISK_FRAUD",
    "MARKETING",
    "CONTENT_MODERATOR",
  ],
  users: ["SUPER_ADMIN", "OPERATIONS", "CUSTOMER_SUPPORT", "RISK_FRAUD"],
  listings: ["SUPER_ADMIN", "OPERATIONS", "CONTENT_MODERATOR"],
  orders: ["SUPER_ADMIN", "OPERATIONS", "FINANCE", "CUSTOMER_SUPPORT"],
  disputes: ["SUPER_ADMIN", "OPERATIONS", "FINANCE", "CUSTOMER_SUPPORT"],
  verifications: [
    "SUPER_ADMIN",
    "OPERATIONS",
    "RISK_FRAUD",
    "CUSTOMER_SUPPORT",
  ],
  reports: [
    "SUPER_ADMIN",
    "OPERATIONS",
    "CONTENT_MODERATOR",
    "RISK_FRAUD",
  ],
  fraud: ["SUPER_ADMIN", "OPERATIONS", "RISK_FRAUD"],
  support: ["SUPER_ADMIN", "OPERATIONS", "CUSTOMER_SUPPORT"],
  catalog: [
    "SUPER_ADMIN",
    "OPERATIONS",
    "CONTENT_MODERATOR",
    "MARKETING",
  ],
  promotions: ["SUPER_ADMIN", "OPERATIONS", "MARKETING"],
  analytics: ["SUPER_ADMIN", "OPERATIONS", "FINANCE", "MARKETING"],
  finance: ["SUPER_ADMIN", "FINANCE", "OPERATIONS"],
  audit: ["SUPER_ADMIN", "OPERATIONS", "RISK_FRAUD"],
  security: [
    "SUPER_ADMIN",
    "OPERATIONS",
    "FINANCE",
    "CUSTOMER_SUPPORT",
    "RISK_FRAUD",
    "MARKETING",
    "CONTENT_MODERATOR",
  ],
} as const;

/** Map admin app paths → allowed roles (page-level gate). */
export function rolesForPath(pathname: string): readonly string[] | null {
  if (pathname === "/login") return null;
  if (pathname === "/" || pathname === "") return NAV_ROLES.dashboard;
  const map: Record<string, readonly string[]> = {
    "/users": NAV_ROLES.users,
    "/listings": NAV_ROLES.listings,
    "/orders": NAV_ROLES.orders,
    "/disputes": NAV_ROLES.disputes,
    "/verifications": NAV_ROLES.verifications,
    "/reports": NAV_ROLES.reports,
    "/appeals": NAV_ROLES.reports,
    "/fraud": NAV_ROLES.fraud,
    "/support": NAV_ROLES.support,
    "/catalog": NAV_ROLES.catalog,
    "/communities": NAV_ROLES.catalog,
    "/promotions": NAV_ROLES.promotions,
    "/analytics": NAV_ROLES.analytics,
    "/finance": NAV_ROLES.finance,
    "/audit": NAV_ROLES.audit,
    "/security": NAV_ROLES.security,
    "/pro-sellers": NAV_ROLES.listings,
    "/corporate": NAV_ROLES.listings,
    "/partners": NAV_ROLES.catalog,
    "/inspections": NAV_ROLES.orders,
    "/referrals": NAV_ROLES.promotions,
  };
  for (const [prefix, roles] of Object.entries(map)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return roles;
    }
  }
  return NAV_ROLES.dashboard;
}
