-- Phase 4: Chat + Offers

CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'LISTING_CARD', 'OFFER_CARD', 'SYSTEM');
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'WITHDRAWN', 'EXPIRED');
CREATE TYPE "OrderIntentStatus" AS ENUM ('PENDING', 'CONVERTED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "ChatScanKind" AS ENUM ('OFF_PLATFORM_PAYMENT', 'EXTERNAL_LINK', 'ADVANCE_PAYMENT', 'SCAM_PHRASE');

-- Extend Report for user reports (listing optional, reportedUserId optional)
ALTER TABLE "reports" ALTER COLUMN "listingId" DROP NOT NULL;
ALTER TABLE "reports" ADD COLUMN "reportedUserId" UUID;
ALTER TABLE "reports" ADD COLUMN "conversationId" UUID;
CREATE INDEX "reports_reportedUserId_idx" ON "reports"("reportedUserId");

CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversations_listingId_buyerId_sellerId_key" ON "conversations"("listingId", "buyerId", "sellerId");
CREATE INDEX "conversations_buyerId_lastMessageAt_idx" ON "conversations"("buyerId", "lastMessageAt");
CREATE INDEX "conversations_sellerId_lastMessageAt_idx" ON "conversations"("sellerId", "lastMessageAt");

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "conversationId" UUID,
    "buyerId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "note" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "parentOfferId" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "offers_listingId_status_idx" ON "offers"("listingId", "status");
CREATE INDEX "offers_buyerId_listingId_status_idx" ON "offers"("buyerId", "listingId", "status");
CREATE INDEX "offers_expiresAt_idx" ON "offers"("expiresAt");

ALTER TABLE "offers" ADD CONSTRAINT "offers_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offers" ADD CONSTRAINT "offers_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "offers" ADD CONSTRAINT "offers_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offers" ADD CONSTRAINT "offers_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offers" ADD CONSTRAINT "offers_parentOfferId_fkey" FOREIGN KEY ("parentOfferId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "type" "MessageType" NOT NULL,
    "body" TEXT,
    "imageKey" TEXT,
    "offerId" UUID,
    "listingCardId" UUID,
    "clientMsgId" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "scamWarning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "messages_conversationId_clientMsgId_key" ON "messages"("conversationId", "clientMsgId");
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_listingCardId_fkey" FOREIGN KEY ("listingCardId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "offer_events" (
    "id" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" UUID,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "offer_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "offer_events_offerId_createdAt_idx" ON "offer_events"("offerId", "createdAt");

ALTER TABLE "offer_events" ADD CONSTRAINT "offer_events_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offer_events" ADD CONSTRAINT "offer_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "order_intents" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "offerId" UUID,
    "amountKobo" INTEGER NOT NULL,
    "status" "OrderIntentStatus" NOT NULL DEFAULT 'PENDING',
    "reservedUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_intents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_intents_listingId_status_idx" ON "order_intents"("listingId", "status");
CREATE INDEX "order_intents_buyerId_idx" ON "order_intents"("buyerId");

ALTER TABLE "order_intents" ADD CONSTRAINT "order_intents_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_intents" ADD CONSTRAINT "order_intents_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_intents" ADD CONSTRAINT "order_intents_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_intents" ADD CONSTRAINT "order_intents_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "user_blocks" (
    "id" UUID NOT NULL,
    "blockerId" UUID NOT NULL,
    "blockedId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_blocks_blockerId_blockedId_key" ON "user_blocks"("blockerId", "blockedId");
CREATE INDEX "user_blocks_blockedId_idx" ON "user_blocks"("blockedId");

ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_mutes" (
    "id" UUID NOT NULL,
    "muterId" UUID NOT NULL,
    "mutedId" UUID NOT NULL,
    "conversationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_mutes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_mutes_muterId_idx" ON "user_mutes"("muterId");
CREATE INDEX "user_mutes_conversationId_idx" ON "user_mutes"("conversationId");

ALTER TABLE "user_mutes" ADD CONSTRAINT "user_mutes_muterId_fkey" FOREIGN KEY ("muterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_mutes" ADD CONSTRAINT "user_mutes_mutedId_fkey" FOREIGN KEY ("mutedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_mutes" ADD CONSTRAINT "user_mutes_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "chat_scan_rules" (
    "id" UUID NOT NULL,
    "pattern" TEXT NOT NULL,
    "kind" "ChatScanKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_scan_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chat_scan_rules_enabled_idx" ON "chat_scan_rules"("enabled");

ALTER TABLE "reports" ADD CONSTRAINT "reports_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
