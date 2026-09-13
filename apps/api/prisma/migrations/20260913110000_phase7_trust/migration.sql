-- Phase 7: Reviews + Trust Score

CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_MUTUAL', 'PUBLISHED', 'HIDDEN');

CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "revieweeId" UUID NOT NULL,
    "overall" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "communication" INTEGER NOT NULL,
    "punctuality" INTEGER NOT NULL,
    "transactionExperience" INTEGER NOT NULL,
    "body" VARCHAR(500),
    "photoKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING_MUTUAL',
    "reply" VARCHAR(200),
    "repliedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reviews_orderId_reviewerId_key" ON "reviews"("orderId", "reviewerId");
CREATE INDEX "reviews_revieweeId_status_idx" ON "reviews"("revieweeId", "status");
CREATE INDEX "reviews_orderId_idx" ON "reviews"("orderId");

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_revieweeId_fkey"
  FOREIGN KEY ("revieweeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "review_reports" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "review_reports_reviewId_idx" ON "review_reports"("reviewId");
CREATE INDEX "review_reports_reporterId_idx" ON "review_reports"("reporterId");

ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "trust_scores" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "tier" TEXT,
    "completionRate" DOUBLE PRECISION NOT NULL,
    "avgRating" DOUBLE PRECISION,
    "medianResponseMinutes" DOUBLE PRECISION,
    "cancellationRate" DOUBLE PRECISION NOT NULL,
    "disputeRate" DOUBLE PRECISION NOT NULL,
    "accountAgeDays" INTEGER NOT NULL,
    "verificationPoints" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trust_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trust_scores_userId_key" ON "trust_scores"("userId");
CREATE INDEX "trust_scores_score_idx" ON "trust_scores"("score");
CREATE INDEX "trust_scores_tier_idx" ON "trust_scores"("tier");

ALTER TABLE "trust_scores" ADD CONSTRAINT "trust_scores_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "trust_score_history" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "tier" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trust_score_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "trust_score_history_userId_createdAt_idx" ON "trust_score_history"("userId", "createdAt");

ALTER TABLE "trust_score_history" ADD CONSTRAINT "trust_score_history_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "chat_response_samples" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "buyerMessageAt" TIMESTAMP(3) NOT NULL,
    "firstReplyAt" TIMESTAMP(3) NOT NULL,
    "latencyMinutes" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "chat_response_samples_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_response_samples_conversationId_key" ON "chat_response_samples"("conversationId");
CREATE INDEX "chat_response_samples_sellerId_firstReplyAt_idx" ON "chat_response_samples"("sellerId", "firstReplyAt");

ALTER TABLE "chat_response_samples" ADD CONSTRAINT "chat_response_samples_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_response_samples" ADD CONSTRAINT "chat_response_samples_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
