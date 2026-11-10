-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "adminNotesUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "adminNotesUpdatedBy" TEXT;
