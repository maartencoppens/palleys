-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('OPEN', 'SENT_TO_JLC', 'IN_POST_PRODUCTION', 'COMPLETED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "batchId" TEXT;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "lastPickupUpdateAt" TIMESTAMP(3),
ADD COLUMN     "readyForPickupAt" TIMESTAMP(3),
ADD COLUMN     "readyForPickupBy" TEXT;

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "sentToJlcAt" TIMESTAMP(3),
    "sentToJlcBy" TEXT,
    "receivedAt" TIMESTAMP(3),
    "receivedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchStatusChange" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "fromStatus" "BatchStatus",
    "toStatus" "BatchStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Batch_number_key" ON "Batch"("number");

-- CreateIndex
CREATE INDEX "Batch_status_createdAt_idx" ON "Batch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BatchStatusChange_batchId_idx" ON "BatchStatusChange"("batchId");

-- CreateIndex
CREATE INDEX "Order_batchId_idx" ON "Order"("batchId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchStatusChange" ADD CONSTRAINT "BatchStatusChange_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

