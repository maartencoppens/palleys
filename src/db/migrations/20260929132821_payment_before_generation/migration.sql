/*
  Warnings:

  - A unique constraint covering the columns `[shopifyLineItemId]` on the table `Preview` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Preview" ADD COLUMN     "photosDeleteAt" TIMESTAMP(3),
ADD COLUMN     "shopifyLineItemId" TEXT,
ADD COLUMN     "shopifyOrderId" TEXT,
ALTER COLUMN "expiresAt" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Preview_shopifyLineItemId_key" ON "Preview"("shopifyLineItemId");

-- CreateIndex
CREATE INDEX "Preview_status_expiresAt_idx" ON "Preview"("status", "expiresAt");
