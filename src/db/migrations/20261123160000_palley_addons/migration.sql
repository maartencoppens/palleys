-- Extras on a personalised Palley (src/data/addons.ts), e.g. a Santa hat. Additive: existing rows get none.
ALTER TABLE "CartLine" ADD COLUMN "addons" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "OrderItem" ADD COLUMN "addons" TEXT[] DEFAULT ARRAY[]::TEXT[];
