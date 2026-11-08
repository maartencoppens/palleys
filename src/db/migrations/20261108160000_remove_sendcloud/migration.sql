-- Sendcloud is no longer used: drop what only its Dynamic Checkout and webhook filled in.
ALTER TABLE "Shipment" DROP COLUMN "checkoutIdentifier",
DROP COLUMN "providerStatus",
DROP COLUMN "providerStatusAt";
