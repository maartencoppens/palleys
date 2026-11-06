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
  it("charges none: Palleys is exempt", () => {
    expect(vatIncluded(2799)).toBe(0);
  });

  it("extracts VAT from an amount at a given rate", () => {
    expect(vatIncluded(12100, 2100)).toBe(2100);
    expect(vatIncluded(2799, 2100)).toBe(486);
    expect(vatIncluded(0, 2100)).toBe(0);
  });

  it("supports another rate", () => {
    expect(vatIncluded(10600, 600)).toBe(600);
  });
});

describe("computeTotals", () => {
  it("adds lines and shipping, without VAT", () => {
    const totals = computeTotals(
      [
        { unitCents: 2799, quantity: 2 },
        { unitCents: 2799, quantity: 1 },
      ],
      495,
    );
    expect(totals).toEqual({ subtotalCents: 8397, discountCents: 0, shippingCents: 495, totalCents: 8892, vatCents: 0 });
  });

  it("takes a discount off the products", () => {
    const totals = computeTotals([{ unitCents: 2799, quantity: 1 }], 495, 280);
    expect(totals).toEqual({ subtotalCents: 2799, discountCents: 280, shippingCents: 495, totalCents: 3014, vatCents: 0 });
  });

  it("refuses a discount larger than the products, so shipping can't be discounted away", () => {
    expect(() => computeTotals([{ unitCents: 2799, quantity: 1 }], 495, 2800)).toThrow();
    expect(() => computeTotals([{ unitCents: 2799, quantity: 1 }], 495, -1)).toThrow();
    expect(() => computeTotals([{ unitCents: 2799, quantity: 1 }], 495, 1.5)).toThrow();
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
