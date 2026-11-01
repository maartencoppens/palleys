-- AlterTable
ALTER TABLE "CartLine" ADD COLUMN     "collectibleId" TEXT,
ALTER COLUMN "previewId" DROP NOT NULL,
ALTER COLUMN "edition" DROP NOT NULL,
ALTER COLUMN "animal" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "createdBy" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "street" DROP NOT NULL,
ALTER COLUMN "houseNumber" DROP NOT NULL,
ALTER COLUMN "postalCode" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "termsVersion" DROP NOT NULL,
ALTER COLUMN "termsAcceptedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "checkedInBy" TEXT,
ADD COLUMN     "collectibleId" TEXT,
ALTER COLUMN "previewId" DROP NOT NULL,
ALTER COLUMN "edition" DROP NOT NULL,
ALTER COLUMN "animal" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN     "catalog" JSONB,
ADD COLUMN     "company" JSONB,
ADD COLUMN     "siteContent" JSONB;

-- CreateTable
CREATE TABLE "Collectible" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tag" TEXT,
    "priceCents" INTEGER NOT NULL,
    "imageKey" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "soldOut" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collectible_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collectible_slug_key" ON "Collectible"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Collectible_sku_key" ON "Collectible"("sku");

-- CreateIndex
CREATE INDEX "Collectible_published_archivedAt_sortOrder_idx" ON "Collectible"("published", "archivedAt", "sortOrder");

-- CreateIndex
CREATE INDEX "CartLine_collectibleId_idx" ON "CartLine"("collectibleId");

-- CreateIndex
CREATE UNIQUE INDEX "CartLine_cartId_collectibleId_key" ON "CartLine"("cartId", "collectibleId");

-- CreateIndex
CREATE INDEX "OrderItem_collectibleId_idx" ON "OrderItem"("collectibleId");

-- AddForeignKey
ALTER TABLE "CartLine" ADD CONSTRAINT "CartLine_collectibleId_fkey" FOREIGN KEY ("collectibleId") REFERENCES "Collectible"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_collectibleId_fkey" FOREIGN KEY ("collectibleId") REFERENCES "Collectible"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A cart line or order item is exactly one of the two product kinds.
ALTER TABLE "CartLine" ADD CONSTRAINT "CartLine_one_product_check"
  CHECK (("previewId" IS NULL) <> ("collectibleId" IS NULL));
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_one_product_check"
  CHECK (("previewId" IS NULL) <> ("collectibleId" IS NULL));
