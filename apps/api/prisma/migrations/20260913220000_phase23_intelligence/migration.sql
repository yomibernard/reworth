-- Phase 2.3 — Intelligence (saved-search alerts, recs v2, valuation, experiments)

-- Listing city scope
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "city" TEXT NOT NULL DEFAULT 'Lagos';
CREATE INDEX IF NOT EXISTS "listings_city_idx" ON "listings"("city");

-- Saved search alert controls
ALTER TABLE "saved_searches" ADD COLUMN IF NOT EXISTS "paused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "saved_searches" ADD COLUMN IF NOT EXISTS "digestEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "saved_searches_paused_digestEnabled_idx"
  ON "saved_searches"("paused", "digestEnabled");

CREATE TABLE IF NOT EXISTS "saved_search_alert_dedupe" (
  "id" UUID NOT NULL,
  "savedSearchId" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "saved_search_alert_dedupe_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "saved_search_alert_dedupe_savedSearchId_listingId_key"
  ON "saved_search_alert_dedupe"("savedSearchId", "listingId");
CREATE INDEX IF NOT EXISTS "saved_search_alert_dedupe_notifiedAt_idx"
  ON "saved_search_alert_dedupe"("notifiedAt");

ALTER TABLE "saved_search_alert_dedupe" DROP CONSTRAINT IF EXISTS "saved_search_alert_dedupe_savedSearchId_fkey";
ALTER TABLE "saved_search_alert_dedupe" ADD CONSTRAINT "saved_search_alert_dedupe_savedSearchId_fkey"
  FOREIGN KEY ("savedSearchId") REFERENCES "saved_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Feature store
CREATE TABLE IF NOT EXISTS "user_features" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "city" TEXT NOT NULL DEFAULT 'Lagos',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_features_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_features_userId_key" ON "user_features"("userId");
CREATE INDEX IF NOT EXISTS "user_features_city_idx" ON "user_features"("city");

CREATE TABLE IF NOT EXISTS "listing_features" (
  "id" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  "city" TEXT NOT NULL DEFAULT 'Lagos',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "listing_features_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "listing_features_listingId_key" ON "listing_features"("listingId");
CREATE INDEX IF NOT EXISTS "listing_features_city_idx" ON "listing_features"("city");

-- A/B experiments
CREATE TABLE IF NOT EXISTS "experiments" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "variants" JSONB NOT NULL,
  "trafficPct" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "experiments_key_key" ON "experiments"("key");

CREATE TABLE IF NOT EXISTS "experiment_assignments" (
  "id" UUID NOT NULL,
  "experimentId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "variant" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "experiment_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "experiment_assignments_experimentId_userId_key"
  ON "experiment_assignments"("experimentId", "userId");
CREATE INDEX IF NOT EXISTS "experiment_assignments_userId_idx"
  ON "experiment_assignments"("userId");

ALTER TABLE "experiment_assignments" DROP CONSTRAINT IF EXISTS "experiment_assignments_experimentId_fkey";
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_experimentId_fkey"
  FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "experiment_metrics" (
  "id" UUID NOT NULL,
  "experimentId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "variant" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "listingId" UUID,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "experiment_metrics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "experiment_metrics_experimentId_event_variant_idx"
  ON "experiment_metrics"("experimentId", "event", "variant");
CREATE INDEX IF NOT EXISTS "experiment_metrics_createdAt_idx"
  ON "experiment_metrics"("createdAt");

ALTER TABLE "experiment_metrics" DROP CONSTRAINT IF EXISTS "experiment_metrics_experimentId_fkey";
ALTER TABLE "experiment_metrics" ADD CONSTRAINT "experiment_metrics_experimentId_fkey"
  FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Valuation model reports
CREATE TABLE IF NOT EXISTS "valuation_model_reports" (
  "id" UUID NOT NULL,
  "city" TEXT NOT NULL,
  "categoryId" UUID,
  "sampleCount" INTEGER NOT NULL,
  "maeKobo" DOUBLE PRECISION NOT NULL,
  "coveragePct" DOUBLE PRECISION NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "valuation_model_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "valuation_model_reports_city_createdAt_idx"
  ON "valuation_model_reports"("city", "createdAt");
