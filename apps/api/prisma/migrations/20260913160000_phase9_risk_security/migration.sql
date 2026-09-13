-- Phase 9: Risk engine, moderation, privacy consents

CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "ModerationOutcome" AS ENUM ('PASS', 'UNDER_REVIEW', 'REJECTED');
CREATE TYPE "AppealStatus" AS ENUM ('OPEN', 'APPROVED', 'DENIED');
CREATE TYPE "ConsentChannel" AS ENUM ('SMS', 'MARKETING', 'EMAIL');

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "riskScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "enhancedVerificationRequired" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "fingerprint" TEXT;
CREATE INDEX IF NOT EXISTS "devices_fingerprint_idx" ON "devices"("fingerprint");

CREATE TABLE IF NOT EXISTS "risk_rules" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "risk_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "risk_rules_code_key" ON "risk_rules"("code");

CREATE TABLE IF NOT EXISTS "risk_assessments" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "listingId" UUID,
    "level" "RiskLevel" NOT NULL,
    "score" INTEGER NOT NULL,
    "rulesFired" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "risk_assessments_userId_idx" ON "risk_assessments"("userId");
CREATE INDEX IF NOT EXISTS "risk_assessments_listingId_idx" ON "risk_assessments"("listingId");
CREATE INDEX IF NOT EXISTS "risk_assessments_level_idx" ON "risk_assessments"("level");
CREATE INDEX IF NOT EXISTS "risk_assessments_createdAt_idx" ON "risk_assessments"("createdAt");

ALTER TABLE "risk_assessments" DROP CONSTRAINT IF EXISTS "risk_assessments_userId_fkey";
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "risk_assessments" DROP CONSTRAINT IF EXISTS "risk_assessments_listingId_fkey";
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "moderation_keywords" (
    "id" UUID NOT NULL,
    "pattern" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "moderation_keywords_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "moderation_keywords_enabled_idx" ON "moderation_keywords"("enabled");
CREATE INDEX IF NOT EXISTS "moderation_keywords_category_idx" ON "moderation_keywords"("category");

CREATE TABLE IF NOT EXISTS "moderation_decisions" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "outcome" "ModerationOutcome" NOT NULL,
    "reasons" TEXT[],
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "moderation_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "moderation_decisions_listingId_idx" ON "moderation_decisions"("listingId");
CREATE INDEX IF NOT EXISTS "moderation_decisions_outcome_idx" ON "moderation_decisions"("outcome");
CREATE INDEX IF NOT EXISTS "moderation_decisions_createdAt_idx" ON "moderation_decisions"("createdAt");

ALTER TABLE "moderation_decisions" DROP CONSTRAINT IF EXISTS "moderation_decisions_listingId_fkey";
ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "moderation_appeals" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    CONSTRAINT "moderation_appeals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "moderation_appeals_listingId_idx" ON "moderation_appeals"("listingId");
CREATE INDEX IF NOT EXISTS "moderation_appeals_userId_idx" ON "moderation_appeals"("userId");
CREATE INDEX IF NOT EXISTS "moderation_appeals_status_idx" ON "moderation_appeals"("status");

ALTER TABLE "moderation_appeals" DROP CONSTRAINT IF EXISTS "moderation_appeals_listingId_fkey";
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_appeals" DROP CONSTRAINT IF EXISTS "moderation_appeals_userId_fkey";
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_appeals" DROP CONSTRAINT IF EXISTS "moderation_appeals_reviewedById_fkey";
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "consent_records" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" "ConsentChannel" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "consent_records_userId_channel_key" ON "consent_records"("userId", "channel");
CREATE INDEX IF NOT EXISTS "consent_records_userId_idx" ON "consent_records"("userId");

ALTER TABLE "consent_records" DROP CONSTRAINT IF EXISTS "consent_records_userId_fkey";
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
