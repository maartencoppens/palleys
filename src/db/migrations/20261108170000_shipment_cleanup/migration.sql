-- Labels are made by hand in the bpost tool: drop what only a carrier integration would have filled in.
ALTER TABLE "Shipment" DROP COLUMN "labelKey",
DROP COLUMN "providerShipmentId",
DROP COLUMN "servicePointId",
DROP COLUMN "servicePointSnapshot";
