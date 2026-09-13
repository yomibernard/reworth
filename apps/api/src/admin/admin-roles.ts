import { AdminRole } from '@prisma/client';

/** Common role bundles for Phase 8 admin routes. */
export const OPS = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
] as const;

export const USERS_READ = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.CUSTOMER_SUPPORT,
  AdminRole.RISK_FRAUD,
] as const;

export const USERS_WRITE = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.RISK_FRAUD,
  AdminRole.CUSTOMER_SUPPORT,
] as const;

export const LISTINGS_MOD = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.CONTENT_MODERATOR,
] as const;

export const FINANCE = [
  AdminRole.SUPER_ADMIN,
  AdminRole.FINANCE,
] as const;

export const ORDERS_READ = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.FINANCE,
  AdminRole.CUSTOMER_SUPPORT,
] as const;

export const DISPUTES = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.FINANCE,
  AdminRole.CUSTOMER_SUPPORT,
] as const;

export const VERIFICATIONS = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.RISK_FRAUD,
  AdminRole.CUSTOMER_SUPPORT,
] as const;

export const REPORTS = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.CONTENT_MODERATOR,
  AdminRole.RISK_FRAUD,
] as const;

export const FRAUD = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.RISK_FRAUD,
] as const;

export const SUPPORT = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.CUSTOMER_SUPPORT,
] as const;

export const CATALOG = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.CONTENT_MODERATOR,
  AdminRole.MARKETING,
] as const;

export const PROMOTIONS = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.MARKETING,
] as const;

export const ANALYTICS = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.FINANCE,
  AdminRole.MARKETING,
] as const;

export const AUDIT = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.RISK_FRAUD,
] as const;

export const DASHBOARD = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.FINANCE,
  AdminRole.CUSTOMER_SUPPORT,
  AdminRole.RISK_FRAUD,
  AdminRole.MARKETING,
  AdminRole.CONTENT_MODERATOR,
] as const;
