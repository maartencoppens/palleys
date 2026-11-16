-- AlterTable
ALTER TABLE "Preview" ADD COLUMN "processedMeta" JSONB,
ADD COLUMN "targetCollectibleId" TEXT;

-- AlterTable
ALTER TABLE "PreviewPhoto" ADD COLUMN "inPrompt" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CollectibleModel" (
    "id" TEXT NOT NULL,
    "collectibleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "fileName" TEXT,
    "previewId" TEXT,
    "meta" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectibleModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectibleModel_key_key" ON "CollectibleModel"("key");

-- CreateIndex
CREATE INDEX "CollectibleModel_collectibleId_createdAt_idx" ON "CollectibleModel"("collectibleId", "createdAt");

-- CreateIndex
CREATE INDEX "CollectibleModel_previewId_idx" ON "CollectibleModel"("previewId");

-- AddForeignKey
ALTER TABLE "Preview" ADD CONSTRAINT "Preview_targetCollectibleId_fkey" FOREIGN KEY ("targetCollectibleId") REFERENCES "Collectible"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleModel" ADD CONSTRAINT "CollectibleModel_collectibleId_fkey" FOREIGN KEY ("collectibleId") REFERENCES "Collectible"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleModel" ADD CONSTRAINT "CollectibleModel_previewId_fkey" FOREIGN KEY ("previewId") REFERENCES "Preview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: a model generated for a collectible points at that collectible, and every current model is its first version.
UPDATE "Preview" p SET "targetCollectibleId" = c."id" FROM "Collectible" c WHERE c."sourcePreviewId" = p."id";

INSERT INTO "CollectibleModel" ("id", "collectibleId", "key", "fileName", "previewId", "createdBy", "createdAt")
SELECT gen_random_uuid()::text, c."id", c."modelKey", c."modelFileName", c."sourcePreviewId", c."updatedBy", c."updatedAt"
FROM "Collectible" c WHERE c."modelKey" IS NOT NULL;
