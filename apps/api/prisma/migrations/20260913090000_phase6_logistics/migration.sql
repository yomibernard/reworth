-- Phase 6: Logistics + Notification Engine

CREATE TYPE "DeliveryShipmentStatus" AS ENUM (
  'QUOTED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'
);
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'CLOSED');

ALTER TABLE "profiles" ADD COLUMN "quietHoursStart" INTEGER;
ALTER TABLE "profiles" ADD COLUMN "quietHoursEnd" INTEGER;

CREATE TABLE "meet_points" (
    "id" UUID NOT NULL,
    "community" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "landmark" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meet_points_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "meet_points_community_active_idx" ON "meet_points"("community", "active");

ALTER TABLE "orders" ADD COLUMN "meetPointId" UUID;
CREATE INDEX "orders_meetPointId_idx" ON "orders"("meetPointId");
ALTER TABLE "orders" ADD CONSTRAINT "orders_meetPointId_fkey"
  FOREIGN KEY ("meetPointId") REFERENCES "meet_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "delivery_shipments" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "quoteKobo" INTEGER NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "status" "DeliveryShipmentStatus" NOT NULL DEFAULT 'QUOTED',
    "etaFrom" TIMESTAMP(3),
    "etaTo" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "delivery_shipments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "delivery_shipments_orderId_key" ON "delivery_shipments"("orderId");
CREATE INDEX "delivery_shipments_providerRef_idx" ON "delivery_shipments"("providerRef");
CREATE INDEX "delivery_shipments_status_idx" ON "delivery_shipments"("status");
ALTER TABLE "delivery_shipments" ADD CONSTRAINT "delivery_shipments_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "delivery_events" (
    "id" UUID NOT NULL,
    "shipmentId" UUID NOT NULL,
    "status" "DeliveryShipmentStatus" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "delivery_events_shipmentId_createdAt_idx" ON "delivery_events"("shipmentId", "createdAt");
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_shipmentId_fkey"
  FOREIGN KEY ("shipmentId") REFERENCES "delivery_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "address_disclosures" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "disclosedById" UUID NOT NULL,
    "addressSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "address_disclosures_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "address_disclosures_orderId_key" ON "address_disclosures"("orderId");
CREATE INDEX "address_disclosures_disclosedById_idx" ON "address_disclosures"("disclosedById");
ALTER TABLE "address_disclosures" ADD CONSTRAINT "address_disclosures_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "address_disclosures" ADD CONSTRAINT "address_disclosures_disclosedById_fkey"
  FOREIGN KEY ("disclosedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deepLink" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");
CREATE INDEX "notifications_category_idx" ON "notifications"("category");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notification_preferences_userId_category_channel_key"
  ON "notification_preferences"("userId", "category", "channel");
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "device_push_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "device_push_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "device_push_tokens_userId_token_key" ON "device_push_tokens"("userId", "token");
CREATE INDEX "device_push_tokens_userId_idx" ON "device_push_tokens"("userId");
ALTER TABLE "device_push_tokens" ADD CONSTRAINT "device_push_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "orderId" UUID,
    "userId" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "support_tickets_userId_status_idx" ON "support_tickets"("userId", "status");
CREATE INDEX "support_tickets_orderId_idx" ON "support_tickets"("orderId");
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
