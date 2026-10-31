import { describe, expect, it } from "vitest";
import { computeTotals, getVariant, parcelFor, priceFor, variantFor, vatIncluded } from "./utils";

describe("variants", () => {
  it("builds the existing SKU scheme from a configurator choice", () => {
    expect(variantFor("keychain", "dog").sku).toBe("PAL-GP-KEY-HOND");
    expect(variantFor("figure", "guinea-pig").sku).toBe("PAL-GP-FIG-CAVIA");
  });

  it("looks a SKU back up and rejects unknown SKUs or sizes", () => {
    expect(getVariant("PAL-GP-FIG-KAT")).toEqual({ sku: "PAL-GP-FIG-KAT", type: "figurine", species: "cat", size: "M" });
    expect(getVariant("PAL-GP-KEY-DINO")).toBeNull();
    expect(getVariant("PAL-GP-KEY-KAT", "XXL")).toBeNull();
    expect(getVariant("PAL-GP-KEY-KAT", "__proto__")).toBeNull();
  });

  it("prices every variant from config, in cents", () => {
    expect(priceFor(variantFor("keychain", "cat"))).toBe(2799);
    expect(priceFor(variantFor("figure", "snake"))).toBe(2799);
  });
});

describe("VAT", () => {
  it("extracts 21% VAT from a VAT-inclusive amount", () => {
    expect(vatIncluded(12100)).toBe(2100);
    expect(vatIncluded(2799)).toBe(486);
    expect(vatIncluded(0)).toBe(0);
  });

  it("supports another rate", () => {
    expect(vatIncluded(10600, 600)).toBe(600);
  });
});

describe("computeTotals", () => {
  it("adds lines and shipping, with VAT over the total", () => {
    const totals = computeTotals(
      [
        { unitCents: 2799, quantity: 2 },
        { unitCents: 2799, quantity: 1 },
      ],
      495,
    );
    expect(totals).toEqual({ subtotalCents: 8397, shippingCents: 495, totalCents: 8892, vatCents: 1543 });
  });

  it("rejects non-integer or negative input", () => {
    expect(() => computeTotals([{ unitCents: 27.99, quantity: 1 }], 0)).toThrow();
    expect(() => computeTotals([{ unitCents: 2799, quantity: 0 }], 0)).toThrow();
    expect(() => computeTotals([{ unitCents: 2799, quantity: 1 }], -1)).toThrow();
  });
});

describe("parcelFor", () => {
  it("adds packaging to every copy", () => {
    expect(parcelFor([{ size: "M", quantity: 3 }]).weightGrams).toBe(40 + 3 * 25);
  });
});
