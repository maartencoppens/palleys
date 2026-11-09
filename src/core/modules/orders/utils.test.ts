import { describe, expect, it } from "vitest";
import { invoiceCounterKey, maskEmail, orderYear, palleyNameOf } from "./utils";

describe("invoice years", () => {
  it("keeps one counter per year", () => {
    expect(invoiceCounterKey(2026)).toBe("invoice-2026");
  });

  it("counts the year in Brussels time", () => {
    expect(orderYear(new Date("2026-12-31T23:30:00Z"))).toBe(2027);
    expect(orderYear(new Date("2026-12-31T22:30:00Z"))).toBe(2026);
  });
});

describe("maskEmail", () => {
  it("keeps only a hint of the address", () => {
    expect(maskEmail("jan.peeters@gmail.com")).toBe("ja***@gmail.com");
    expect(maskEmail("nope")).toBe("***");
  });
});

describe("palleyNameOf", () => {
  const item = { position: 2, productCode: "P-RING-KAT", reprintNr: 0, order: { number: "PLY1042", reprintOf: null } };

  it("names a Palley after its order and line", () => {
    expect(palleyNameOf(item)).toBe("PAL-PLY1042-02-P-RING-KAT");
  });

  it("names a reprint after the order it was first made for", () => {
    expect(palleyNameOf({ ...item, reprintNr: 1, order: { number: "PLY1050", reprintOf: { number: "PLY1042" } } })).toBe(
      "PAL-PLY1042-02-P-RING-KAT-R1",
    );
  });
});
