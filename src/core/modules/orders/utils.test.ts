import { describe, expect, it } from "vitest";
import { invoiceCounterKey, maskEmail, orderYear } from "./utils";

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
