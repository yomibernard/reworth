-- Phase 2.1 — Swap Marketplace + Give-Away Claims

CREATE TYPE "SwapProposalStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'COUNTERED',
  'WITHDRAWN',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TYPE "GiveawayClaimStatus" AS ENUM (
  'CLAIMED',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'EXPIRED'
);

CREATE TYPE "TransactionType" AS ENUM (
  'CASH',
  'SWAP',
  'SWAP_CASH',
  'GIVEAWAY'
);

CREATE TYPE "SwapLegStatus" AS ENUM (
  'PENDING',
  'HANDED_OVER',
  'RECEIVED',
  'FAILED',
  'RETURNED'
);

ALTER TYPE "MessageType" ADD VALUE 'SWAP_PROPOSAL_CARD';
ALTER TYPE "MessageType" ADD VALUE 'GIVEAWAY_CLAIM';

ALTER TABLE "orders"
  ADD COLUMN "transactionType" "TransactionType" NOT NULL DEFAULT 'CASH',
  ADD COLUMN "swapProposalId" UUID,
  ADD COLUMN "giveawayClaimId" UUID,
  ADD COLUMN "swapListingAId" UUID,
  ADD COLUMN "swapListingBId" UUID,
  ADD COLUMN "legAStatus" "SwapLegStatus",
  ADD COLUMN "legBStatus" "SwapLegStatus",
  ADD COLUMN "cashRecipientId" UUID;

CREATE UNIQUE INDEX "orders_swapProposalId_key" ON "orders"("swapProposalId");
CREATE UNIQUE INDEX "orders_giveawayClaimId_key" ON "orders"("giveawayClaimId");
CREATE INDEX "orders_transactionType_idx" ON "orders"("transactionType");

CREATE TABLE "swap_proposals" (
  "id" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  "proposerId" UUID NOT NULL,
  "offeredListingId" UUID NOT NULL,
  "cashComponentKobo" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "status" "SwapProposalStatus" NOT NULL DEFAULT 'PENDING',
  "parentProposalId" UUID,
  "conversationId" UUID,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "swap_proposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "giveaway_claims" (
  "id" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  "claimantId" UUID NOT NULL,
  "status" "GiveawayClaimStatus" NOT NULL DEFAULT 'CLAIMED',
  "note" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),

  CONSTRAINT "giveaway_claims_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "swap_proposals_listingId_status_idx" ON "swap_proposals"("listingId", "status");
CREATE INDEX "swap_proposals_proposerId_listingId_status_idx" ON "swap_proposals"("proposerId", "listingId", "status");
CREATE INDEX "swap_proposals_offeredListingId_idx" ON "swap_proposals"("offeredListingId");
CREATE INDEX "swap_proposals_expiresAt_idx" ON "swap_proposals"("expiresAt");

CREATE UNIQUE INDEX "giveaway_claims_listingId_claimantId_key" ON "giveaway_claims"("listingId", "claimantId");
CREATE INDEX "giveaway_claims_listingId_status_idx" ON "giveaway_claims"("listingId", "status");
CREATE INDEX "giveaway_claims_claimantId_idx" ON "giveaway_claims"("claimantId");
CREATE INDEX "giveaway_claims_expiresAt_idx" ON "giveaway_claims"("expiresAt");

ALTER TABLE "swap_proposals" ADD CONSTRAINT "swap_proposals_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "swap_proposals" ADD CONSTRAINT "swap_proposals_offeredListingId_fkey" FOREIGN KEY ("offeredListingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "swap_proposals" ADD CONSTRAINT "swap_proposals_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "swap_proposals" ADD CONSTRAINT "swap_proposals_parentProposalId_fkey" FOREIGN KEY ("parentProposalId") REFERENCES "swap_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "swap_proposals" ADD CONSTRAINT "swap_proposals_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "giveaway_claims" ADD CONSTRAINT "giveaway_claims_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "giveaway_claims" ADD CONSTRAINT "giveaway_claims_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_swapProposalId_fkey" FOREIGN KEY ("swapProposalId") REFERENCES "swap_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_giveawayClaimId_fkey" FOREIGN KEY ("giveawayClaimId") REFERENCES "giveaway_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_swapListingAId_fkey" FOREIGN KEY ("swapListingAId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_swapListingBId_fkey" FOREIGN KEY ("swapListingBId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_cashRecipientId_fkey" FOREIGN KEY ("cashRecipientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
