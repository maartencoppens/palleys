-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cartId" TEXT,
ADD COLUMN     "discountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountCode" TEXT,
ADD COLUMN     "discountCodeId" TEXT;

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "minSubtotalCents" INTEGER NOT NULL DEFAULT 0,
    "maxRedemptions" INTEGER,
    "oncePerEmail" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "Order_discountCodeId_idx" ON "Order"("discountCodeId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
