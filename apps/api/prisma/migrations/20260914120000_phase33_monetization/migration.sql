-- Phase 3.3 Monetization

-- AlterEnum
ALTER TYPE "PromotionKind" ADD VALUE IF NOT EXISTS 'PROMOTED';

-- AlterTable promotions
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "feeConfigVersionId" UUID;
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "pspReference" TEXT;
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "promotions_idempotencyKey_key" ON "promotions"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "promotions_endsAt_idx" ON "promotions"("endsAt");

-- AlterTable communities
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "premium" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "membershipFeeKobo" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "listingFeeKobo" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "RevenueStream" AS ENUM (
  'PROTECTION_FEE',
  'DELIVERY_MARGIN',
  'BOOST',
  'FEATURED',
  'PROMOTED',
  'SUBSCRIPTION',
  'INSPECTION_FEE',
  'AUTHENTICATION_FEE',
  'CONSIGNMENT_FEE',
  'OTHER'
);

CREATE TYPE "RevenueLineStatus" AS ENUM ('PENDING', 'SETTLED', 'REFUNDED');
CREATE TYPE "SellerPlanTier" AS ENUM ('STARTER', 'PLUS');
CREATE TYPE "SellerSubscriptionStatus" AS ENUM ('NONE', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

CREATE TABLE "fee_config_versions" (
  "id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "rates" JSONB NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" UUID,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fee_config_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "fee_config_versions_version_key" ON "fee_config_versions"("version");
CREATE INDEX "fee_config_versions_effectiveFrom_idx" ON "fee_config_versions"("effectiveFrom");

CREATE TABLE "revenue_lines" (
  "id" UUID NOT NULL,
  "stream" "RevenueStream" NOT NULL,
  "grossKobo" INTEGER NOT NULL,
  "netKobo" INTEGER NOT NULL,
  "status" "RevenueLineStatus" NOT NULL DEFAULT 'PENDING',
  "orderId" UUID,
  "listingId" UUID,
  "sellerId" UUID,
  "city" TEXT NOT NULL DEFAULT 'Lagos',
  "categoryId" UUID,
  "pspReference" TEXT,
  "deferredPsp" BOOLEAN NOT NULL DEFAULT false,
  "feeConfigVersionId" UUID,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "meta" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  CONSTRAINT "revenue_lines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "revenue_lines_stream_referenceType_referenceId_key" ON "revenue_lines"("stream", "referenceType", "referenceId");
CREATE INDEX "revenue_lines_stream_createdAt_idx" ON "revenue_lines"("stream", "createdAt");
CREATE INDEX "revenue_lines_city_createdAt_idx" ON "revenue_lines"("city", "createdAt");
CREATE INDEX "revenue_lines_status_idx" ON "revenue_lines"("status");
CREATE INDEX "revenue_lines_pspReference_idx" ON "revenue_lines"("pspReference");

CREATE TABLE "seller_subscriptions" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tier" "SellerPlanTier" NOT NULL DEFAULT 'STARTER',
  "status" "SellerSubscriptionStatus" NOT NULL DEFAULT 'NONE',
  "feeConfigVersionId" UUID,
  "priceKobo" INTEGER NOT NULL DEFAULT 0,
  "subscriptionRef" TEXT,
  "currentPeriodEnd" TIMESTAMP(3),
  "graceUntil" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "seller_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "seller_subscriptions_userId_key" ON "seller_subscriptions"("userId");
CREATE INDEX "seller_subscriptions_status_idx" ON "seller_subscriptions"("status");

CREATE TABLE "finance_alerts" (
  "id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'warning',
  "message" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "resolvedAt" TIMESTAMP(3),
  "acknowledgedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "finance_alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "finance_alerts_resolvedAt_createdAt_idx" ON "finance_alerts"("resolvedAt", "createdAt");

CREATE TABLE "reconciliation_runs" (
  "id" UUID NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "matchedCount" INTEGER NOT NULL DEFAULT 0,
  "mismatchCount" INTEGER NOT NULL DEFAULT 0,
  "details" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "promotions" ADD CONSTRAINT "promotions_feeConfigVersionId_fkey" FOREIGN KEY ("feeConfigVersionId") REFERENCES "fee_config_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "revenue_lines" ADD CONSTRAINT "revenue_lines_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "revenue_lines" ADD CONSTRAINT "revenue_lines_feeConfigVersionId_fkey" FOREIGN KEY ("feeConfigVersionId") REFERENCES "fee_config_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seller_subscriptions" ADD CONSTRAINT "seller_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seller_subscriptions" ADD CONSTRAINT "seller_subscriptions_feeConfigVersionId_fkey" FOREIGN KEY ("feeConfigVersionId") REFERENCES "fee_config_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finance_alerts" ADD CONSTRAINT "finance_alerts_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
