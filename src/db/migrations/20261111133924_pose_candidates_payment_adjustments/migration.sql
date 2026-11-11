-- CreateEnum
CREATE TYPE "PoseSource" AS ENUM ('GENERATED', 'UPLOADED');

-- CreateEnum
CREATE TYPE "PaymentAdjustmentKind" AS ENUM ('REFUND', 'CHARGEBACK');

-- CreateTable
CREATE TABLE "PoseCandidate" (
    "id" TEXT NOT NULL,
    "previewId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "source" "PoseSource" NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,

    CONSTRAINT "PoseCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAdjustment" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "kind" "PaymentAdjustmentKind" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,

    CONSTRAINT "PaymentAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PoseCandidate_key_key" ON "PoseCandidate"("key");

-- CreateIndex
CREATE INDEX "PoseCandidate_previewId_createdAt_idx" ON "PoseCandidate"("previewId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAdjustment_occurredAt_idx" ON "PaymentAdjustment"("occurredAt");

-- CreateIndex
CREATE INDEX "PaymentAdjustment_paymentId_idx" ON "PaymentAdjustment"("paymentId");

-- CreateIndex
CREATE INDEX "Order_paidAt_idx" ON "Order"("paidAt");

-- AddForeignKey
ALTER TABLE "PoseCandidate" ADD CONSTRAINT "PoseCandidate_previewId_fkey" FOREIGN KEY ("previewId") REFERENCES "Preview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAdjustment" ADD CONSTRAINT "PaymentAdjustment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: de huidige pose van elke preview wordt haar eerste kandidaat. Uploads of pogingen van vroeger zijn niet meer
-- te onderscheiden; ze tellen als gegenereerd (poseAttempts blijft wat het was).
INSERT INTO "PoseCandidate" ("id", "previewId", "key", "source", "createdAt")
SELECT gen_random_uuid()::text, "id", "poseImageKey", 'GENERATED', "createdAt"
FROM "Preview"
WHERE "poseImageKey" IS NOT NULL
ON CONFLICT ("key") DO NOTHING;

-- Backfill: terugbetalingen en chargebacks van voor dit logboek. De echte datum werd niet bewaard: de laatste
-- "REFUNDED" in de orderhistoriek als die er is, anders de laatste wijziging van de betaling.
INSERT INTO "PaymentAdjustment" ("id", "paymentId", "kind", "amountCents", "occurredAt", "source")
SELECT gen_random_uuid()::text, p."id", 'REFUND', p."refundedCents",
  COALESCE((SELECT MAX(c."createdAt") FROM "OrderStatusChange" c WHERE c."orderId" = p."orderId" AND c."toStatus" = 'REFUNDED'), p."updatedAt"),
  'backfill'
FROM "Payment" p
WHERE p."refundedCents" > 0;

INSERT INTO "PaymentAdjustment" ("id", "paymentId", "kind", "amountCents", "occurredAt", "source")
SELECT gen_random_uuid()::text, p."id", 'CHARGEBACK', p."chargedBackCents", p."updatedAt", 'backfill'
FROM "Payment" p
WHERE p."chargedBackCents" > 0;
