-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "photoMarketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photoMarketingConsentAt" TIMESTAMP(3);
