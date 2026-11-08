-- CreateTable
CREATE TABLE "DeletedOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "status" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "paymentSummary" TEXT NOT NULL,
    "orderCreatedAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "deletedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeletedOrder_number_idx" ON "DeletedOrder"("number");

