-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('CANCELLATION', 'WITHDRAWAL', 'WARRANTY');

-- CreateEnum
CREATE TYPE "ReturnResolution" AS ENUM ('REPRINT', 'REFUND');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reprintOfId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "cancelledQuantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "ReturnType" NOT NULL,
    "resolution" "ReturnResolution",
    "reason" TEXT,
    "photoKeys" TEXT[],
    "itemsReceived" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReturnStatus" NOT NULL DEFAULT 'SUBMITTED',
    "decisionNote" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'nl',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "reprintOrderId" TEXT,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnRequestItem" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ReturnRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnAccess" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "linkTokenHash" TEXT NOT NULL,
    "linkExpiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "sessionTokenHash" TEXT,
    "sessionExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_reprintOrderId_key" ON "ReturnRequest"("reprintOrderId");

-- CreateIndex
CREATE INDEX "ReturnRequest_status_submittedAt_idx" ON "ReturnRequest"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");

-- CreateIndex
CREATE INDEX "ReturnRequestItem_orderItemId_idx" ON "ReturnRequestItem"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequestItem_returnRequestId_orderItemId_key" ON "ReturnRequestItem"("returnRequestId", "orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnAccess_linkTokenHash_key" ON "ReturnAccess"("linkTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnAccess_sessionTokenHash_key" ON "ReturnAccess"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "ReturnAccess_orderId_idx" ON "ReturnAccess"("orderId");

-- CreateIndex
CREATE INDEX "ReturnAccess_linkExpiresAt_idx" ON "ReturnAccess"("linkExpiresAt");

-- CreateIndex
CREATE INDEX "Order_reprintOfId_idx" ON "Order"("reprintOfId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_reprintOfId_fkey" FOREIGN KEY ("reprintOfId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_reprintOrderId_fkey" FOREIGN KEY ("reprintOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnAccess" ADD CONSTRAINT "ReturnAccess_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Never more cancelled than ordered, and no empty lines in a request.
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_cancelledQuantity_check" CHECK ("cancelledQuantity" >= 0 AND "cancelledQuantity" <= "quantity");
ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_quantity_check" CHECK ("quantity" > 0);
