-- DropIndex
DROP INDEX "CartLine_cartId_collectibleId_key";

-- AlterTable
ALTER TABLE "Collectible" ADD COLUMN     "stock" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "stockOrder" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "CartLine_cartId_collectibleId_idx" ON "CartLine"("cartId", "collectibleId");
