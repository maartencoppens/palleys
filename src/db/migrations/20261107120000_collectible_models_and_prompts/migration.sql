-- AlterTable
ALTER TABLE "Collectible" ADD COLUMN     "modelFileName" TEXT,
ADD COLUMN     "modelKey" TEXT,
ADD COLUMN     "sourcePreviewId" TEXT;

-- AlterTable
ALTER TABLE "Preview" ADD COLUMN     "forCollectible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN     "prompts" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Collectible_sourcePreviewId_key" ON "Collectible"("sourcePreviewId");

-- AddForeignKey
ALTER TABLE "Collectible" ADD CONSTRAINT "Collectible_sourcePreviewId_fkey" FOREIGN KEY ("sourcePreviewId") REFERENCES "Preview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
