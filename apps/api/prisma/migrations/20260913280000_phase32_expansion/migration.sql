-- Phase 3.2 — B2B & Expansion (corporate relocation, estate partners, circular, region city)

DO $$ BEGIN
  CREATE TYPE "CorporateAccountStatus" AS ENUM (
    'APPLIED',
    'APPROVED',
    'ACTIVE',
    'SUSPENDED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RelocationProjectStatus" AS ENUM (
    'DRAFT',
    'INTAKE',
    'LISTED',
    'IN_FULFILMENT',
    'COMPLETING',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EstatePartnerStatus" AS ENUM (
    'APPLIED',
    'ACTIVE',
    'SUSPENDED',
    'REVOKED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CircularPartnerKind" AS ENUM (
    'CHARITY',
    'RECYCLER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CircularHandoffStatus" AS ENUM (
    'SCHEDULED',
    'PICKED_UP',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "city" TEXT NOT NULL DEFAULT 'Lagos';
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "brandingJson" JSONB NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS "communities_city_idx" ON "communities"("city");

ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "donateIfUnsoldDays" INTEGER;

CREATE TABLE IF NOT EXISTS "corporate_accounts" (
  "id" UUID NOT NULL,
  "companyName" TEXT NOT NULL,
  "billingContact" TEXT NOT NULL,
  "billingEmail" TEXT NOT NULL,
  "dpaRecordRef" TEXT,
  "supportTier" TEXT NOT NULL DEFAULT 'standard',
  "status" "CorporateAccountStatus" NOT NULL DEFAULT 'APPLIED',
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "corporate_accounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "corporate_accounts_status_idx" ON "corporate_accounts"("status");

CREATE TABLE IF NOT EXISTS "corporate_memberships" (
  "id" UUID NOT NULL,
  "corporateAccountId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'COORDINATOR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "corporate_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_memberships_corporateAccountId_userId_key"
  ON "corporate_memberships"("corporateAccountId", "userId");
CREATE INDEX IF NOT EXISTS "corporate_memberships_userId_idx" ON "corporate_memberships"("userId");

CREATE TABLE IF NOT EXISTS "relocation_projects" (
  "id" UUID NOT NULL,
  "corporateAccountId" UUID NOT NULL,
  "ownerUserId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "employeeName" TEXT NOT NULL,
  "deadline" TIMESTAMP(3) NOT NULL,
  "cityFrom" TEXT NOT NULL,
  "cityTo" TEXT NOT NULL,
  "communityFrom" TEXT NOT NULL DEFAULT '',
  "communityTo" TEXT NOT NULL DEFAULT '',
  "status" "RelocationProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "movingSaleId" UUID,
  "completionReport" JSONB,
  "invoiceNumber" TEXT,
  "invoicePdfKey" TEXT,
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "relocation_projects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "relocation_projects_movingSaleId_key" ON "relocation_projects"("movingSaleId");
CREATE INDEX IF NOT EXISTS "relocation_projects_corporateAccountId_status_idx"
  ON "relocation_projects"("corporateAccountId", "status");
CREATE INDEX IF NOT EXISTS "relocation_projects_ownerUserId_idx" ON "relocation_projects"("ownerUserId");

CREATE TABLE IF NOT EXISTS "relocation_items" (
  "id" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "listingId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "relocation_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "relocation_items_listingId_key" ON "relocation_items"("listingId");
CREATE INDEX IF NOT EXISTS "relocation_items_projectId_idx" ON "relocation_items"("projectId");

CREATE TABLE IF NOT EXISTS "estate_partners" (
  "id" UUID NOT NULL,
  "communityId" UUID NOT NULL,
  "companyName" TEXT NOT NULL,
  "contactEmail" TEXT NOT NULL,
  "status" "EstatePartnerStatus" NOT NULL DEFAULT 'APPLIED',
  "apiKeyHash" TEXT,
  "apiKeyPrefix" TEXT,
  "webhookSecret" TEXT,
  "webhookUrl" TEXT,
  "brandingJson" JSONB NOT NULL DEFAULT '{}',
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "estate_partners_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "estate_partners_communityId_idx" ON "estate_partners"("communityId");
CREATE INDEX IF NOT EXISTS "estate_partners_status_idx" ON "estate_partners"("status");
CREATE INDEX IF NOT EXISTS "estate_partners_apiKeyPrefix_idx" ON "estate_partners"("apiKeyPrefix");

CREATE TABLE IF NOT EXISTS "estate_partner_webhook_events" (
  "id" UUID NOT NULL,
  "estatePartnerId" UUID NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "estate_partner_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "estate_partner_webhook_events_estatePartnerId_eventId_key"
  ON "estate_partner_webhook_events"("estatePartnerId", "eventId");
CREATE INDEX IF NOT EXISTS "estate_partner_webhook_events_processedAt_idx"
  ON "estate_partner_webhook_events"("processedAt");

CREATE TABLE IF NOT EXISTS "circular_partners" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "CircularPartnerKind" NOT NULL,
  "city" TEXT NOT NULL DEFAULT 'Lagos',
  "acceptedCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "contactEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "circular_partners_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "circular_partners_city_active_idx" ON "circular_partners"("city", "active");

CREATE TABLE IF NOT EXISTS "circular_handoffs" (
  "id" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  "sellerId" UUID NOT NULL,
  "circularPartnerId" UUID NOT NULL,
  "status" "CircularHandoffStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "receiptKey" TEXT,
  "recipientLabel" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "circular_handoffs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "circular_handoffs_listingId_idx" ON "circular_handoffs"("listingId");
CREATE INDEX IF NOT EXISTS "circular_handoffs_sellerId_idx" ON "circular_handoffs"("sellerId");
CREATE INDEX IF NOT EXISTS "circular_handoffs_status_idx" ON "circular_handoffs"("status");

DO $$ BEGIN
  ALTER TABLE "corporate_memberships"
    ADD CONSTRAINT "corporate_memberships_corporateAccountId_fkey"
    FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "corporate_memberships"
    ADD CONSTRAINT "corporate_memberships_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "relocation_projects"
    ADD CONSTRAINT "relocation_projects_corporateAccountId_fkey"
    FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "relocation_projects"
    ADD CONSTRAINT "relocation_projects_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "relocation_projects"
    ADD CONSTRAINT "relocation_projects_movingSaleId_fkey"
    FOREIGN KEY ("movingSaleId") REFERENCES "moving_sales"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "relocation_items"
    ADD CONSTRAINT "relocation_items_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "relocation_projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "relocation_items"
    ADD CONSTRAINT "relocation_items_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "listings"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "estate_partners"
    ADD CONSTRAINT "estate_partners_communityId_fkey"
    FOREIGN KEY ("communityId") REFERENCES "communities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "estate_partners"
    ADD CONSTRAINT "estate_partners_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "estate_partner_webhook_events"
    ADD CONSTRAINT "estate_partner_webhook_events_estatePartnerId_fkey"
    FOREIGN KEY ("estatePartnerId") REFERENCES "estate_partners"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "circular_handoffs"
    ADD CONSTRAINT "circular_handoffs_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "listings"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "circular_handoffs"
    ADD CONSTRAINT "circular_handoffs_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "circular_handoffs"
    ADD CONSTRAINT "circular_handoffs_circularPartnerId_fkey"
    FOREIGN KEY ("circularPartnerId") REFERENCES "circular_partners"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
