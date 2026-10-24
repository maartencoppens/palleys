/*
  Warnings:

  - You are about to drop the column `originalPhotoKey` on the `Preview` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Preview" DROP COLUMN "originalPhotoKey";

-- CreateTable
CREATE TABLE "PreviewPhoto" (
    "id" TEXT NOT NULL,
    "previewId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreviewPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreviewStatusChange" (
    "id" TEXT NOT NULL,
    "previewId" TEXT NOT NULL,
    "fromStatus" "PreviewStatus" NOT NULL,
    "toStatus" "PreviewStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreviewStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreviewPhoto_key_key" ON "PreviewPhoto"("key");

-- CreateIndex
CREATE INDEX "PreviewPhoto_previewId_idx" ON "PreviewPhoto"("previewId");

-- CreateIndex
CREATE INDEX "PreviewStatusChange_previewId_idx" ON "PreviewStatusChange"("previewId");

-- AddForeignKey
ALTER TABLE "PreviewPhoto" ADD CONSTRAINT "PreviewPhoto_previewId_fkey" FOREIGN KEY ("previewId") REFERENCES "Preview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreviewStatusChange" ADD CONSTRAINT "PreviewStatusChange_previewId_fkey" FOREIGN KEY ("previewId") REFERENCES "Preview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
