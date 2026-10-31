import { describe, expect, it } from "vitest";
import { formatOrderNumber, maskEmail, orderYear } from "./utils";

describe("order numbers", () => {
  it("pads the sequence", () => {
    expect(formatOrderNumber(2026, 42)).toBe("PAL-2026-00042");
    expect(formatOrderNumber(2027, 123456)).toBe("PAL-2027-123456");
  });

  it("rejects invalid sequences", () => {
    expect(() => formatOrderNumber(2026, 0)).toThrow();
    expect(() => formatOrderNumber(2026, 1.5)).toThrow();
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
