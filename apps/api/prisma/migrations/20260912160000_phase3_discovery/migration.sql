-- Phase 3: Discovery — Favourites, SellerFollow, SavedSearch

CREATE TABLE "favourites" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favourites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favourites_userId_listingId_key" ON "favourites"("userId", "listingId");
CREATE INDEX "favourites_userId_idx" ON "favourites"("userId");
CREATE INDEX "favourites_listingId_idx" ON "favourites"("listingId");

ALTER TABLE "favourites" ADD CONSTRAINT "favourites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "seller_follows" (
    "id" UUID NOT NULL,
    "followerId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "seller_follows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seller_follows_followerId_sellerId_key" ON "seller_follows"("followerId", "sellerId");
CREATE INDEX "seller_follows_followerId_idx" ON "seller_follows"("followerId");
CREATE INDEX "seller_follows_sellerId_idx" ON "seller_follows"("sellerId");

ALTER TABLE "seller_follows" ADD CONSTRAINT "seller_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seller_follows" ADD CONSTRAINT "seller_follows_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "newMatchesCount" INTEGER NOT NULL DEFAULT 0,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saved_searches_userId_idx" ON "saved_searches"("userId");

ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
