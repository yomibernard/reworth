-- Phase 2.4 — Verticals & Commercial (vehicle inspection, luxury auth, pro, referrals)

-- OrderStatus: insert IN_AUTHENTICATION (Postgres ADD VALUE; do not reorder existing)
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'IN_AUTHENTICATION';

-- New enums
DO $$ BEGIN
  CREATE TYPE "InspectionStatus" AS ENUM (
    'REQUESTED',
    'PAYMENT_PENDING',
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'EXPIRED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AuthenticationStatus" AS ENUM (
    'NOT_REQUIRED',
    'REQUIRED',
    'PENDING',
    'PASSED',
    'FAILED',
    'OPTED_OUT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LuxuryAuthJobStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'PASSED',
    'FAILED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProAccountStatus" AS ENUM (
    'APPLIED',
    'APPROVED',
    'ACTIVE',
    'GRACE',
    'SUSPENDED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BulkUploadStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReferralRewardStatus" AS ENUM (
    'PENDING',
    'GRANTED',
    'BLOCKED',
    'FLAGGED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Profile.handle (pro storefront)
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "handle" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_handle_key" ON "profiles"("handle");

-- Listing luxury auth columns
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "authRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "authenticationStatus" "AuthenticationStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "certificateId" TEXT;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "authenticatedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "listings_authenticationStatus_idx" ON "listings"("authenticationStatus");

-- Vehicle inspections
CREATE TABLE IF NOT EXISTS "vehicle_inspections" (
  "id" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  "requesterId" UUID NOT NULL,
  "status" "InspectionStatus" NOT NULL DEFAULT 'REQUESTED',
  "feeKobo" INTEGER NOT NULL,
  "paymentRef" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "slotLabel" TEXT,
  "partnerRef" TEXT,
  "conditionScore" INTEGER,
  "verifiedMileage" INTEGER,
  "accidentNotes" TEXT,
  "tyreBatteryNotes" TEXT,
  "registrationOk" BOOLEAN,
  "reportPhotos" JSONB NOT NULL DEFAULT '[]',
  "reportChecklist" JSONB NOT NULL DEFAULT '{}',
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vehicle_inspections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "vehicle_inspections_listingId_status_idx"
  ON "vehicle_inspections"("listingId", "status");
CREATE INDEX IF NOT EXISTS "vehicle_inspections_requesterId_idx"
  ON "vehicle_inspections"("requesterId");
CREATE INDEX IF NOT EXISTS "vehicle_inspections_expiresAt_idx"
  ON "vehicle_inspections"("expiresAt");

ALTER TABLE "vehicle_inspections" DROP CONSTRAINT IF EXISTS "vehicle_inspections_listingId_fkey";
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_inspections" DROP CONSTRAINT IF EXISTS "vehicle_inspections_requesterId_fkey";
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Luxury auth jobs
CREATE TABLE IF NOT EXISTS "luxury_auth_jobs" (
  "id" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "buyerId" UUID NOT NULL,
  "sellerId" UUID NOT NULL,
  "status" "LuxuryAuthJobStatus" NOT NULL DEFAULT 'PENDING',
  "feeKobo" INTEGER NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'SHIP_TO_AUTH',
  "partnerRef" TEXT,
  "certificateId" TEXT,
  "evidenceJson" JSONB NOT NULL DEFAULT '{}',
  "failReason" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "luxury_auth_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "luxury_auth_jobs_orderId_key" ON "luxury_auth_jobs"("orderId");
CREATE INDEX IF NOT EXISTS "luxury_auth_jobs_listingId_status_idx"
  ON "luxury_auth_jobs"("listingId", "status");
CREATE INDEX IF NOT EXISTS "luxury_auth_jobs_status_idx" ON "luxury_auth_jobs"("status");

ALTER TABLE "luxury_auth_jobs" DROP CONSTRAINT IF EXISTS "luxury_auth_jobs_listingId_fkey";
ALTER TABLE "luxury_auth_jobs" ADD CONSTRAINT "luxury_auth_jobs_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "luxury_auth_jobs" DROP CONSTRAINT IF EXISTS "luxury_auth_jobs_orderId_fkey";
ALTER TABLE "luxury_auth_jobs" ADD CONSTRAINT "luxury_auth_jobs_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "luxury_auth_jobs" DROP CONSTRAINT IF EXISTS "luxury_auth_jobs_buyerId_fkey";
ALTER TABLE "luxury_auth_jobs" ADD CONSTRAINT "luxury_auth_jobs_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "luxury_auth_jobs" DROP CONSTRAINT IF EXISTS "luxury_auth_jobs_sellerId_fkey";
ALTER TABLE "luxury_auth_jobs" ADD CONSTRAINT "luxury_auth_jobs_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Pro accounts
CREATE TABLE IF NOT EXISTS "pro_accounts" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "status" "ProAccountStatus" NOT NULL DEFAULT 'APPLIED',
  "tier" TEXT NOT NULL DEFAULT 'STANDARD',
  "businessName" TEXT NOT NULL,
  "businessDetails" JSONB NOT NULL DEFAULT '{}',
  "sampleListingIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "applicationNotes" TEXT,
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "subscriptionRef" TEXT,
  "subscriptionStatus" TEXT NOT NULL DEFAULT 'none',
  "mrrKobo" INTEGER NOT NULL DEFAULT 0,
  "currentPeriodEnd" TIMESTAMP(3),
  "graceUntil" TIMESTAMP(3),
  "warningCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "pro_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pro_accounts_userId_key" ON "pro_accounts"("userId");
CREATE INDEX IF NOT EXISTS "pro_accounts_status_idx" ON "pro_accounts"("status");

ALTER TABLE "pro_accounts" DROP CONSTRAINT IF EXISTS "pro_accounts_userId_fkey";
ALTER TABLE "pro_accounts" ADD CONSTRAINT "pro_accounts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bulk upload jobs
CREATE TABLE IF NOT EXISTS "bulk_upload_jobs" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "proAccountId" UUID NOT NULL,
  "status" "BulkUploadStatus" NOT NULL DEFAULT 'PENDING',
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "errorsJson" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "bulk_upload_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "bulk_upload_jobs_userId_createdAt_idx"
  ON "bulk_upload_jobs"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "bulk_upload_jobs_status_idx" ON "bulk_upload_jobs"("status");

ALTER TABLE "bulk_upload_jobs" DROP CONSTRAINT IF EXISTS "bulk_upload_jobs_userId_fkey";
ALTER TABLE "bulk_upload_jobs" ADD CONSTRAINT "bulk_upload_jobs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bulk_upload_jobs" DROP CONSTRAINT IF EXISTS "bulk_upload_jobs_proAccountId_fkey";
ALTER TABLE "bulk_upload_jobs" ADD CONSTRAINT "bulk_upload_jobs_proAccountId_fkey"
  FOREIGN KEY ("proAccountId") REFERENCES "pro_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Referral programme
CREATE TABLE IF NOT EXISTS "referral_codes" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_userId_key" ON "referral_codes"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_code_key" ON "referral_codes"("code");

ALTER TABLE "referral_codes" DROP CONSTRAINT IF EXISTS "referral_codes_userId_fkey";
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "referral_attributions" (
  "id" UUID NOT NULL,
  "referralCodeId" UUID NOT NULL,
  "referrerId" UUID NOT NULL,
  "referredUserId" UUID NOT NULL,
  "deviceFingerprintHash" TEXT,
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "phoneVerifiedAt" TIMESTAMP(3),
  "firstTxnAt" TIMESTAMP(3),
  "riskFlagged" BOOLEAN NOT NULL DEFAULT false,
  "riskReason" TEXT,

  CONSTRAINT "referral_attributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "referral_attributions_referredUserId_key"
  ON "referral_attributions"("referredUserId");
CREATE INDEX IF NOT EXISTS "referral_attributions_referrerId_idx"
  ON "referral_attributions"("referrerId");
CREATE INDEX IF NOT EXISTS "referral_attributions_deviceFingerprintHash_idx"
  ON "referral_attributions"("deviceFingerprintHash");

ALTER TABLE "referral_attributions" DROP CONSTRAINT IF EXISTS "referral_attributions_referralCodeId_fkey";
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referralCodeId_fkey"
  FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_attributions" DROP CONSTRAINT IF EXISTS "referral_attributions_referrerId_fkey";
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referrerId_fkey"
  FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_attributions" DROP CONSTRAINT IF EXISTS "referral_attributions_referredUserId_fkey";
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referredUserId_fkey"
  FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "referral_rewards" (
  "id" UUID NOT NULL,
  "attributionId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "status" "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING',
  "rewardType" TEXT NOT NULL DEFAULT 'FREE_BOOST',
  "meta" JSONB NOT NULL DEFAULT '{}',
  "grantedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "referral_rewards_userId_status_idx"
  ON "referral_rewards"("userId", "status");
CREATE INDEX IF NOT EXISTS "referral_rewards_attributionId_idx"
  ON "referral_rewards"("attributionId");

ALTER TABLE "referral_rewards" DROP CONSTRAINT IF EXISTS "referral_rewards_attributionId_fkey";
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_attributionId_fkey"
  FOREIGN KEY ("attributionId") REFERENCES "referral_attributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_rewards" DROP CONSTRAINT IF EXISTS "referral_rewards_userId_fkey";
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "referral_programme_config" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL DEFAULT 'default',
  "rewardType" TEXT NOT NULL DEFAULT 'FREE_BOOST',
  "maxRewardsPerReferrerPerDay" INTEGER NOT NULL DEFAULT 10,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "referral_programme_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "referral_programme_config_key_key"
  ON "referral_programme_config"("key");
