import { describe, expect, it } from "vitest";
import { DEFAULT_ANIMALS } from "@/data/animals";
import { computeTotals, parcelFor, priceFor, variantFor, vatIncluded } from "./utils";

const animal = (value: string) => DEFAULT_ANIMALS.find((option) => option.value === value)!;

describe("variants", () => {
  it("builds the existing SKU scheme from a configurator choice", () => {
    expect(variantFor("keychain", animal("dog")).sku).toBe("PAL-GP-KEY-HOND");
    expect(variantFor("figure", animal("guinea-pig")).sku).toBe("PAL-GP-FIG-CAVIA");
    expect(variantFor("keychain", { code: "PAPEGAAI" }).sku).toBe("PAL-GP-KEY-PAPEGAAI");
  });

  it("prices every variant from config, in cents", () => {
    expect(priceFor(variantFor("keychain", animal("cat")))).toBe(2799);
    expect(priceFor(variantFor("figure", animal("snake")))).toBe(2799);
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
