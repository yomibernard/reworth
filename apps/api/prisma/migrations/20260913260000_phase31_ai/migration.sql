-- Phase 3.1 — AI & Platform Services (assistant, room scan, instant buy, consignment, managed pickup)

DO $$ BEGIN
  CREATE TYPE "AssistantMessageRole" AS ENUM (
    'USER',
    'ASSISTANT',
    'SYSTEM',
    'TOOL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RoomScanStatus" AS ENUM (
    'UPLOADED',
    'DETECTING',
    'READY',
    'DRAFTS_CREATED',
    'FAILED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InstantBuyFulfilmentStatus" AS ENUM (
    'PENDING_PICKUP',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'CONFIRMED',
    'SLA_BREACHED',
    'REFUNDED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ConsignmentStatus" AS ENUM (
    'INTAKE',
    'LISTED',
    'SOLD',
    'RETURNED',
    'EXPIRED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ManagedPickupStatus" AS ENUM (
    'BOOKED',
    'ASSIGNED',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "instantBuyEligible" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "listings_instantBuyEligible_idx" ON "listings"("instantBuyEligible");

CREATE TABLE IF NOT EXISTS "assistant_sessions" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "city" TEXT NOT NULL DEFAULT 'Lagos',
  "title" TEXT NOT NULL DEFAULT 'Ask ReWorth',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assistant_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "assistant_messages" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "role" "AssistantMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "toolName" TEXT,
  "toolPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "assistant_action_logs" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "toolName" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "output" JSONB,
  "confirmed" BOOLEAN NOT NULL DEFAULT false,
  "latencyMs" INTEGER,
  "costMicros" INTEGER,
  "degraded" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assistant_action_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "saved_bundles" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "city" TEXT NOT NULL DEFAULT 'Lagos',
  "brief" TEXT NOT NULL,
  "budgetKobo" INTEGER NOT NULL,
  "listingIds" TEXT[],
  "totalKobo" INTEGER NOT NULL,
  "shareToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "saved_bundles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "room_scans" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "city" TEXT NOT NULL DEFAULT 'Lagos',
  "status" "RoomScanStatus" NOT NULL DEFAULT 'UPLOADED',
  "photoKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "detections" JSONB NOT NULL DEFAULT '[]',
  "draftBatchId" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "room_scans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "room_scan_items" (
  "id" UUID NOT NULL,
  "roomScanId" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "brandHint" TEXT,
  "categoryHint" TEXT,
  "cropKey" TEXT,
  "bbox" JSONB,
  "selected" BOOLEAN NOT NULL DEFAULT true,
  "condition" TEXT NOT NULL DEFAULT 'GOOD',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "room_scan_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "room_scan_drafts" (
  "id" UUID NOT NULL,
  "roomScanId" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  "itemLabel" TEXT NOT NULL,
  CONSTRAINT "room_scan_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "valuation_logs" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "city" TEXT NOT NULL DEFAULT 'Lagos',
  "source" TEXT NOT NULL,
  "photoKey" TEXT,
  "listingId" UUID,
  "result" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "valuation_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "instant_buy_fulfilments" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  "status" "InstantBuyFulfilmentStatus" NOT NULL DEFAULT 'PENDING_PICKUP',
  "slaDeadlineAt" TIMESTAMP(3) NOT NULL,
  "pickedUpAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "refundIdempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "instant_buy_fulfilments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "consignments" (
  "id" UUID NOT NULL,
  "consignorId" UUID NOT NULL,
  "listingId" UUID,
  "status" "ConsignmentStatus" NOT NULL DEFAULT 'INTAKE',
  "city" TEXT NOT NULL DEFAULT 'Lagos',
  "title" TEXT NOT NULL,
  "floorPriceKobo" INTEGER NOT NULL,
  "askingPriceKobo" INTEGER NOT NULL,
  "feeBps" INTEGER NOT NULL DEFAULT 1500,
  "soldPriceKobo" INTEGER,
  "feeKobo" INTEGER,
  "netPayoutKobo" INTEGER,
  "listedAt" TIMESTAMP(3),
  "soldAt" TIMESTAMP(3),
  "returnBy" TIMESTAMP(3),
  "returnedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "consignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "managed_pickups" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "city" TEXT NOT NULL DEFAULT 'Lagos',
  "status" "ManagedPickupStatus" NOT NULL DEFAULT 'BOOKED',
  "slotStartAt" TIMESTAMP(3) NOT NULL,
  "slotEndAt" TIMESTAMP(3) NOT NULL,
  "addressLine" TEXT NOT NULL,
  "photoAddon" BOOLEAN NOT NULL DEFAULT false,
  "photoKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "partnerRef" TEXT,
  "roomScanId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "managed_pickups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "saved_bundles_shareToken_key" ON "saved_bundles"("shareToken");
CREATE UNIQUE INDEX IF NOT EXISTS "room_scan_drafts_roomScanId_listingId_key" ON "room_scan_drafts"("roomScanId", "listingId");
CREATE UNIQUE INDEX IF NOT EXISTS "instant_buy_fulfilments_orderId_key" ON "instant_buy_fulfilments"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "instant_buy_fulfilments_listingId_key" ON "instant_buy_fulfilments"("listingId");
CREATE UNIQUE INDEX IF NOT EXISTS "instant_buy_fulfilments_refundIdempotencyKey_key" ON "instant_buy_fulfilments"("refundIdempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "consignments_listingId_key" ON "consignments"("listingId");

CREATE INDEX IF NOT EXISTS "assistant_sessions_userId_updatedAt_idx" ON "assistant_sessions"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "assistant_messages_sessionId_createdAt_idx" ON "assistant_messages"("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "assistant_action_logs_userId_createdAt_idx" ON "assistant_action_logs"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "assistant_action_logs_toolName_idx" ON "assistant_action_logs"("toolName");
CREATE INDEX IF NOT EXISTS "saved_bundles_userId_createdAt_idx" ON "saved_bundles"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "room_scans_userId_createdAt_idx" ON "room_scans"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "room_scans_status_idx" ON "room_scans"("status");
CREATE INDEX IF NOT EXISTS "room_scan_items_roomScanId_idx" ON "room_scan_items"("roomScanId");
CREATE INDEX IF NOT EXISTS "room_scan_drafts_roomScanId_idx" ON "room_scan_drafts"("roomScanId");
CREATE INDEX IF NOT EXISTS "valuation_logs_userId_createdAt_idx" ON "valuation_logs"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "instant_buy_fulfilments_status_slaDeadlineAt_idx" ON "instant_buy_fulfilments"("status", "slaDeadlineAt");
CREATE INDEX IF NOT EXISTS "consignments_consignorId_status_idx" ON "consignments"("consignorId", "status");
CREATE INDEX IF NOT EXISTS "consignments_status_returnBy_idx" ON "consignments"("status", "returnBy");
CREATE INDEX IF NOT EXISTS "managed_pickups_userId_createdAt_idx" ON "managed_pickups"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "managed_pickups_slotStartAt_idx" ON "managed_pickups"("slotStartAt");

DO $$ BEGIN
  ALTER TABLE "assistant_sessions" ADD CONSTRAINT "assistant_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "assistant_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "assistant_action_logs" ADD CONSTRAINT "assistant_action_logs_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "assistant_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "saved_bundles" ADD CONSTRAINT "saved_bundles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "room_scans" ADD CONSTRAINT "room_scans_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "room_scan_items" ADD CONSTRAINT "room_scan_items_roomScanId_fkey"
    FOREIGN KEY ("roomScanId") REFERENCES "room_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "room_scan_drafts" ADD CONSTRAINT "room_scan_drafts_roomScanId_fkey"
    FOREIGN KEY ("roomScanId") REFERENCES "room_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "valuation_logs" ADD CONSTRAINT "valuation_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "instant_buy_fulfilments" ADD CONSTRAINT "instant_buy_fulfilments_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "instant_buy_fulfilments" ADD CONSTRAINT "instant_buy_fulfilments_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "consignments" ADD CONSTRAINT "consignments_consignorId_fkey"
    FOREIGN KEY ("consignorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "consignments" ADD CONSTRAINT "consignments_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "managed_pickups" ADD CONSTRAINT "managed_pickups_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
