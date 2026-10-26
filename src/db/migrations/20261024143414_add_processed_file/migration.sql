-- AlterTable
ALTER TABLE "Preview" ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processedBy" TEXT,
ADD COLUMN     "processedKey" TEXT;
