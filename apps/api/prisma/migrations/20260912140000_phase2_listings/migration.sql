-- Phase 2: Listings, Media, Categories, Risk, Reports

CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'LIVE', 'RESERVED', 'SOLD', 'EXPIRED', 'REMOVED', 'REJECTED');
CREATE TYPE "SellingMode" AS ENUM ('SELL', 'SWAP', 'SWAP_CASH', 'GIVE_AWAY');
CREATE TYPE "ItemCondition" AS ENUM ('NEW', 'LIKE_NEW', 'VERY_GOOD', 'GOOD', 'FAIR', 'FOR_PARTS');
CREATE TYPE "ListingEventType" AS ENUM ('VIEWED', 'SAVED', 'PRICE_CHANGED', 'STATUS_CHANGED');
CREATE TYPE "ListingImageStatus" AS ENUM ('PENDING', 'READY', 'FAILED');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");
CREATE INDEX "categories_sortOrder_idx" ON "categories"("sortOrder");

ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "categoryId" UUID,
    "subcategoryId" UUID,
    "brand" TEXT,
    "model" TEXT,
    "condition" "ItemCondition" NOT NULL DEFAULT 'GOOD',
    "ageText" TEXT,
    "originalPriceKobo" INTEGER,
    "priceKobo" INTEGER NOT NULL DEFAULT 0,
    "negotiable" BOOLEAN NOT NULL DEFAULT true,
    "sellingMode" "SellingMode" NOT NULL DEFAULT 'SELL',
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "community" TEXT NOT NULL DEFAULT '',
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "addressPrivate" TEXT,
    "fulfilmentPickup" BOOLEAN NOT NULL DEFAULT true,
    "fulfilmentMeet" BOOLEAN NOT NULL DEFAULT true,
    "fulfilmentDelivery" BOOLEAN NOT NULL DEFAULT false,
    "aiUsed" BOOLEAN NOT NULL DEFAULT false,
    "aiEditedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "vehicle" JSONB,
    "riskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "listings_sellerId_idx" ON "listings"("sellerId");
CREATE INDEX "listings_status_idx" ON "listings"("status");
CREATE INDEX "listings_categoryId_idx" ON "listings"("categoryId");
CREATE INDEX "listings_community_idx" ON "listings"("community");
CREATE INDEX "listings_publishedAt_idx" ON "listings"("publishedAt");
CREATE INDEX "listings_expiresAt_idx" ON "listings"("expiresAt");

ALTER TABLE "listings" ADD CONSTRAINT "listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "listing_images" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "originalKey" TEXT NOT NULL,
    "variants" JSONB NOT NULL DEFAULT '{}',
    "width" INTEGER,
    "height" INTEGER,
    "mime" TEXT,
    "sizeBytes" INTEGER,
    "dHash" TEXT,
    "exifStripped" BOOLEAN NOT NULL DEFAULT false,
    "status" "ListingImageStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listing_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "listing_images_listingId_sortOrder_idx" ON "listing_images"("listingId", "sortOrder");
CREATE INDEX "listing_images_dHash_idx" ON "listing_images"("dHash");
CREATE INDEX "listing_images_originalKey_idx" ON "listing_images"("originalKey");

ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "listing_events" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "type" "ListingEventType" NOT NULL,
    "actorUserId" UUID,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listing_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "listing_events_listingId_createdAt_idx" ON "listing_events"("listingId", "createdAt");
CREATE INDEX "listing_events_type_idx" ON "listing_events"("type");

ALTER TABLE "listing_events" ADD CONSTRAINT "listing_events_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_events" ADD CONSTRAINT "listing_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "risk_events" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "listingId" UUID,
    "kind" TEXT NOT NULL,
    "score" INTEGER,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "risk_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "risk_events_listingId_idx" ON "risk_events"("listingId");
CREATE INDEX "risk_events_userId_idx" ON "risk_events"("userId");
CREATE INDEX "risk_events_kind_idx" ON "risk_events"("kind");

ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reports_listingId_idx" ON "reports"("listingId");
CREATE INDEX "reports_reporterId_idx" ON "reports"("reporterId");
CREATE INDEX "reports_status_idx" ON "reports"("status");

ALTER TABLE "reports" ADD CONSTRAINT "reports_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
