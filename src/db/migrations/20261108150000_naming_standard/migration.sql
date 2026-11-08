-- Naming standard (core/utils/naming.ts). Schema only: renumbering existing orders and recomputing product codes is
-- scripts/backfill-naming.ts, run separately.

-- Counters: one running order counter (PLY1001 is the first new number) and invoice counters per year.
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);
INSERT INTO "Counter" ("key", "last") VALUES ('order', 1000);
DROP TABLE "OrderCounter";

-- Invoice number, assigned when an order is paid.
ALTER TABLE "Order" ADD COLUMN "invoiceNumber" TEXT;
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");

-- Order lines: the SKU becomes the product code (recomputed by the backfill), plus position and reprint number.
ALTER TABLE "OrderItem" RENAME COLUMN "sku" TO "productCode";
ALTER TABLE "OrderItem" ADD COLUMN "position" INTEGER,
ADD COLUMN "reprintNr" INTEGER NOT NULL DEFAULT 0;
-- Existing lines in the order they were inserted: the same order as the cart they came from.
UPDATE "OrderItem" AS i SET "position" = p.position
FROM (SELECT "id", ROW_NUMBER() OVER (PARTITION BY "orderId" ORDER BY ctid) AS position FROM "OrderItem") AS p
WHERE p."id" = i."id";
ALTER TABLE "OrderItem" ALTER COLUMN "position" SET NOT NULL;
DROP INDEX "OrderItem_orderId_idx";
CREATE UNIQUE INDEX "OrderItem_orderId_position_key" ON "OrderItem"("orderId", "position");

-- Collectibles: a number that is never reused and an animal code instead of the SKU. Existing ones are numbered from
-- 1 in the order they were made; the sequence continues after the highest.
ALTER TABLE "Collectible" ADD COLUMN "number" SERIAL NOT NULL,
ADD COLUMN "animalCode" TEXT;
UPDATE "Collectible" AS c SET "number" = n.nr
FROM (SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS nr FROM "Collectible") AS n
WHERE n."id" = c."id";
SELECT setval(pg_get_serial_sequence('"Collectible"', 'number'), COALESCE((SELECT MAX("number") FROM "Collectible"), 0) + 1, false);
CREATE UNIQUE INDEX "Collectible_number_key" ON "Collectible"("number");
DROP INDEX "Collectible_sku_key";
ALTER TABLE "Collectible" DROP COLUMN "sku";

-- Shopify is gone, and a preview's order is read through its order line.
DROP INDEX "Preview_shopifyLineItemId_key";
ALTER TABLE "Preview" DROP COLUMN "shopifyLineItemId",
DROP COLUMN "shopifyOrderId",
DROP COLUMN "shopifyOrderNumber";
