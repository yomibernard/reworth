-- Phase 5: Orders, Payments & Disputes

CREATE TYPE "OrderStatus" AS ENUM (
  'CREATED', 'PAYMENT_PENDING', 'FUNDED', 'HANDED_OVER', 'RECEIVED',
  'COMPLETED', 'CANCELLED', 'DISPUTE_HOLD', 'REFUND_REQUESTED', 'REFUND_ISSUED'
);
CREATE TYPE "FulfilmentMethod" AS ENUM ('PICKUP', 'MEET_POINT', 'DELIVERY');
CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING', 'SUCCESS', 'FAILED', 'RELEASED', 'REFUNDED', 'PARTIALLY_REFUNDED'
);
CREATE TYPE "DisputeStatus" AS ENUM ('OPENED', 'AWAITING_SELLER', 'AWAITING_ADMIN', 'RESOLVED');
CREATE TYPE "DisputeReason" AS ENUM (
  'NEVER_RECEIVED', 'MATERIALLY_DIFFERENT', 'COUNTERFEIT',
  'UNDISCLOSED_DAMAGE', 'INCORRECT_PRODUCT'
);
CREATE TYPE "DisputeResolution" AS ENUM (
  'FULL_REFUND', 'PARTIAL_REFUND', 'RELEASE_TO_SELLER', 'CANCEL'
);

ALTER TABLE "order_intents" ADD COLUMN "orderId" UUID;
CREATE UNIQUE INDEX "order_intents_orderId_key" ON "order_intents"("orderId");

CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "offerId" UUID,
    "orderIntentId" UUID,
    "amountKobo" INTEGER NOT NULL,
    "protectionFeeKobo" INTEGER NOT NULL,
    "deliveryFeeKobo" INTEGER NOT NULL DEFAULT 0,
    "totalKobo" INTEGER NOT NULL,
    "fulfilmentMethod" "FulfilmentMethod" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "buyerProtection" BOOLEAN NOT NULL DEFAULT true,
    "coverageEndsAt" TIMESTAMP(3),
    "autoReleaseAt" TIMESTAMP(3),
    "fundedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "orders_orderIntentId_key" ON "orders"("orderIntentId");
CREATE INDEX "orders_buyerId_createdAt_idx" ON "orders"("buyerId", "createdAt");
CREATE INDEX "orders_sellerId_createdAt_idx" ON "orders"("sellerId", "createdAt");
CREATE INDEX "orders_listingId_idx" ON "orders"("listingId");
CREATE INDEX "orders_status_autoReleaseAt_idx" ON "orders"("status", "autoReleaseAt");

ALTER TABLE "orders" ADD CONSTRAINT "orders_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_intents" ADD CONSTRAINT "order_intents_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "order_events" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" UUID,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_events_orderId_createdAt_idx" ON "order_events"("orderId", "createdAt");
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT,
    "providerPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "grossKobo" INTEGER NOT NULL,
    "feesKobo" INTEGER NOT NULL,
    "netKobo" INTEGER NOT NULL,
    "pspReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payouts_orderId_idx" ON "payouts"("orderId");
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "reason" TEXT,
    "idempotencyKey" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refunds_idempotencyKey_key" ON "refunds"("idempotencyKey");
CREATE INDEX "refunds_orderId_idx" ON "refunds"("orderId");
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "openerId" UUID NOT NULL,
    "reason" "DisputeReason" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPENED',
    "detail" TEXT,
    "sellerResponse" TEXT,
    "sellerRespondBy" TIMESTAMP(3),
    "resolution" "DisputeResolution",
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "disputes_orderId_idx" ON "disputes"("orderId");
CREATE INDEX "disputes_status_sellerRespondBy_idx" ON "disputes"("status", "sellerRespondBy");
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_openerId_fkey" FOREIGN KEY ("openerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dispute_evidence" (
    "id" UUID NOT NULL,
    "disputeId" UUID NOT NULL,
    "uploaderId" UUID NOT NULL,
    "text" TEXT,
    "imageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dispute_evidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dispute_evidence_disputeId_idx" ON "dispute_evidence"("disputeId");
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "responseJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_records_key_key" ON "idempotency_records"("key");
CREATE INDEX "idempotency_records_operation_idx" ON "idempotency_records"("operation");
