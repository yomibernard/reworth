-- Phase 8: Admin Operations Portal

ALTER TYPE "SupportTicketStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';

CREATE TYPE "PromotionKind" AS ENUM ('FEATURED', 'BOOST');

ALTER TABLE "risk_events" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "risk_events" ADD COLUMN IF NOT EXISTS "reviewedById" UUID;
CREATE INDEX IF NOT EXISTS "risk_events_reviewedAt_idx" ON "risk_events"("reviewedAt");
ALTER TABLE "risk_events" DROP CONSTRAINT IF EXISTS "risk_events_reviewedById_fkey";
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "assigneeId" UUID;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "support_tickets_assigneeId_idx" ON "support_tickets"("assigneeId");
ALTER TABLE "support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_assigneeId_fkey";
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "support_ticket_notes" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_ticket_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "support_ticket_notes_ticketId_createdAt_idx"
  ON "support_ticket_notes"("ticketId", "createdAt");

ALTER TABLE "support_ticket_notes" DROP CONSTRAINT IF EXISTS "support_ticket_notes_ticketId_fkey";
ALTER TABLE "support_ticket_notes" ADD CONSTRAINT "support_ticket_notes_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_ticket_notes" DROP CONSTRAINT IF EXISTS "support_ticket_notes_authorId_fkey";
ALTER TABLE "support_ticket_notes" ADD CONSTRAINT "support_ticket_notes_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "admin_totp" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "secret" TEXT NOT NULL,
    "enabledAt" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "admin_totp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_totp_userId_key" ON "admin_totp"("userId");
ALTER TABLE "admin_totp" DROP CONSTRAINT IF EXISTS "admin_totp_userId_fkey";
ALTER TABLE "admin_totp" ADD CONSTRAINT "admin_totp_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "promotions" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "kind" "PromotionKind" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "feeKobo" INTEGER NOT NULL DEFAULT 0,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "promotions_listingId_idx" ON "promotions"("listingId");
CREATE INDEX IF NOT EXISTS "promotions_kind_startsAt_endsAt_idx" ON "promotions"("kind", "startsAt", "endsAt");
ALTER TABLE "promotions" DROP CONSTRAINT IF EXISTS "promotions_listingId_fkey";
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotions" DROP CONSTRAINT IF EXISTS "promotions_createdById_fkey";
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "hero_banners" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hero_banners_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hero_banners_active_sortOrder_idx" ON "hero_banners"("active", "sortOrder");

CREATE TABLE IF NOT EXISTS "communities" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "communities_slug_key" ON "communities"("slug");
CREATE INDEX IF NOT EXISTS "communities_active_idx" ON "communities"("active");

CREATE TABLE IF NOT EXISTS "whitelist_entries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whitelist_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "whitelist_entries_userId_idx" ON "whitelist_entries"("userId");
ALTER TABLE "whitelist_entries" DROP CONSTRAINT IF EXISTS "whitelist_entries_userId_fkey";
ALTER TABLE "whitelist_entries" ADD CONSTRAINT "whitelist_entries_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whitelist_entries" DROP CONSTRAINT IF EXISTS "whitelist_entries_createdById_fkey";
ALTER TABLE "whitelist_entries" ADD CONSTRAINT "whitelist_entries_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "user_warnings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_warnings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_warnings_userId_createdAt_idx" ON "user_warnings"("userId", "createdAt");
ALTER TABLE "user_warnings" DROP CONSTRAINT IF EXISTS "user_warnings_userId_fkey";
ALTER TABLE "user_warnings" ADD CONSTRAINT "user_warnings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_warnings" DROP CONSTRAINT IF EXISTS "user_warnings_createdById_fkey";
ALTER TABLE "user_warnings" ADD CONSTRAINT "user_warnings_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
