-- Phase 2.2 — Moving Sales + Estate Communities

DO $$ BEGIN
  CREATE TYPE "MovingSaleStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommunityType" AS ENUM ('ESTATE', 'CORPORATE', 'CHURCH', 'ALUMNI', 'PUBLIC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommunityPrivacy" AS ENUM ('PUBLIC', 'SEMI_PRIVATE', 'PRIVATE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommunityMembershipStatus" AS ENUM (
    'INVITED',
    'APPROVED',
    'MEMBER',
    'SUSPENDED',
    'LEFT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Extend catalog communities (phase 8 stub)
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "type" "CommunityType" NOT NULL DEFAULT 'ESTATE';
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "privacy" "CommunityPrivacy" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "coverUrl" TEXT;
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "about" TEXT NOT NULL DEFAULT '';
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "geoLat" DOUBLE PRECISION;
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "geoLng" DOUBLE PRECISION;
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "communities" SET "type" = 'ESTATE' WHERE "type" IS NULL;
UPDATE "communities" SET "privacy" = 'PUBLIC' WHERE "privacy" IS NULL;

CREATE INDEX IF NOT EXISTS "communities_privacy_idx" ON "communities"("privacy");
CREATE INDEX IF NOT EXISTS "communities_type_idx" ON "communities"("type");

CREATE TABLE IF NOT EXISTS "community_memberships" (
  "id" UUID NOT NULL,
  "communityId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "status" "CommunityMembershipStatus" NOT NULL DEFAULT 'INVITED',
  "verifiedById" UUID,
  "joinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "community_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "community_memberships_communityId_userId_key"
  ON "community_memberships"("communityId", "userId");
CREATE INDEX IF NOT EXISTS "community_memberships_userId_status_idx"
  ON "community_memberships"("userId", "status");
CREATE INDEX IF NOT EXISTS "community_memberships_communityId_status_idx"
  ON "community_memberships"("communityId", "status");

ALTER TABLE "community_memberships" DROP CONSTRAINT IF EXISTS "community_memberships_communityId_fkey";
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_memberships" DROP CONSTRAINT IF EXISTS "community_memberships_userId_fkey";
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "community_invites" (
  "id" UUID NOT NULL,
  "communityId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "createdById" UUID NOT NULL,
  "maxUses" INTEGER NOT NULL DEFAULT 1,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "community_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "community_invites_code_key" ON "community_invites"("code");
CREATE INDEX IF NOT EXISTS "community_invites_communityId_idx" ON "community_invites"("communityId");
CREATE INDEX IF NOT EXISTS "community_invites_expiresAt_idx" ON "community_invites"("expiresAt");

ALTER TABLE "community_invites" DROP CONSTRAINT IF EXISTS "community_invites_communityId_fkey";
ALTER TABLE "community_invites" ADD CONSTRAINT "community_invites_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_invites" DROP CONSTRAINT IF EXISTS "community_invites_createdById_fkey";
ALTER TABLE "community_invites" ADD CONSTRAINT "community_invites_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "community_managers" (
  "id" UUID NOT NULL,
  "communityId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "community_managers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "community_managers_communityId_userId_key"
  ON "community_managers"("communityId", "userId");
CREATE INDEX IF NOT EXISTS "community_managers_userId_idx" ON "community_managers"("userId");

ALTER TABLE "community_managers" DROP CONSTRAINT IF EXISTS "community_managers_communityId_fkey";
ALTER TABLE "community_managers" ADD CONSTRAINT "community_managers_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_managers" DROP CONSTRAINT IF EXISTS "community_managers_userId_fkey";
ALTER TABLE "community_managers" ADD CONSTRAINT "community_managers_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "moving_sales" (
  "id" UUID NOT NULL,
  "sellerId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "blurb" TEXT NOT NULL DEFAULT '',
  "deadline" TIMESTAMP(3) NOT NULL,
  "community" TEXT NOT NULL DEFAULT '',
  "communityId" UUID,
  "geoLat" DOUBLE PRECISION,
  "geoLng" DOUBLE PRECISION,
  "status" "MovingSaleStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "moving_sales_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "moving_sales_sellerId_status_idx" ON "moving_sales"("sellerId", "status");
CREATE INDEX IF NOT EXISTS "moving_sales_status_deadline_idx" ON "moving_sales"("status", "deadline");
CREATE INDEX IF NOT EXISTS "moving_sales_community_idx" ON "moving_sales"("community");

ALTER TABLE "moving_sales" DROP CONSTRAINT IF EXISTS "moving_sales_sellerId_fkey";
ALTER TABLE "moving_sales" ADD CONSTRAINT "moving_sales_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "moving_sales" DROP CONSTRAINT IF EXISTS "moving_sales_communityId_fkey";
ALTER TABLE "moving_sales" ADD CONSTRAINT "moving_sales_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "communityId" UUID;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "communityOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "movingSaleId" UUID;

CREATE INDEX IF NOT EXISTS "listings_communityId_idx" ON "listings"("communityId");
CREATE INDEX IF NOT EXISTS "listings_movingSaleId_idx" ON "listings"("movingSaleId");

ALTER TABLE "listings" DROP CONSTRAINT IF EXISTS "listings_communityId_fkey";
ALTER TABLE "listings" ADD CONSTRAINT "listings_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "listings" DROP CONSTRAINT IF EXISTS "listings_movingSaleId_fkey";
ALTER TABLE "listings" ADD CONSTRAINT "listings_movingSaleId_fkey"
  FOREIGN KEY ("movingSaleId") REFERENCES "moving_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "moving_sale_follows" (
  "id" UUID NOT NULL,
  "movingSaleId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "moving_sale_follows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "moving_sale_follows_movingSaleId_userId_key"
  ON "moving_sale_follows"("movingSaleId", "userId");
CREATE INDEX IF NOT EXISTS "moving_sale_follows_userId_idx" ON "moving_sale_follows"("userId");

ALTER TABLE "moving_sale_follows" DROP CONSTRAINT IF EXISTS "moving_sale_follows_movingSaleId_fkey";
ALTER TABLE "moving_sale_follows" ADD CONSTRAINT "moving_sale_follows_movingSaleId_fkey"
  FOREIGN KEY ("movingSaleId") REFERENCES "moving_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "moving_sale_follows" DROP CONSTRAINT IF EXISTS "moving_sale_follows_userId_fkey";
ALTER TABLE "moving_sale_follows" ADD CONSTRAINT "moving_sale_follows_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "moving_sale_events" (
  "id" UUID NOT NULL,
  "movingSaleId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "actorId" UUID,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "moving_sale_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "moving_sale_events_movingSaleId_type_idx"
  ON "moving_sale_events"("movingSaleId", "type");
CREATE INDEX IF NOT EXISTS "moving_sale_events_createdAt_idx"
  ON "moving_sale_events"("createdAt");

ALTER TABLE "moving_sale_events" DROP CONSTRAINT IF EXISTS "moving_sale_events_movingSaleId_fkey";
ALTER TABLE "moving_sale_events" ADD CONSTRAINT "moving_sale_events_movingSaleId_fkey"
  FOREIGN KEY ("movingSaleId") REFERENCES "moving_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
