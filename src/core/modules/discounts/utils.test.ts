import { describe, expect, it } from "vitest";
import { DISCOUNT_CODE_PATTERN } from "@/data/discounts";
import { discountInputSchema } from "./types";
import {
  discountAmountCents,
  discountRejection,
  discountState,
  generateDiscountCode,
  normalizeDiscountCode,
  type DiscountRule,
} from "./utils";

const rule: DiscountRule = {
  type: "PERCENTAGE",
  value: 10,
  active: true,
  startsAt: null,
  expiresAt: null,
  minSubtotalCents: 0,
  maxRedemptions: null,
  oncePerEmail: false,
};
const unused = { redemptions: 0, emailRedemptions: 0 };
const now = new Date("2026-11-02T12:00:00Z");

describe("discountAmountCents", () => {
  it("takes a percentage, rounded to the cent", () => {
    expect(discountAmountCents({ type: "PERCENTAGE", value: 10 }, 2799)).toBe(280);
    expect(discountAmountCents({ type: "PERCENTAGE", value: 100 }, 2799)).toBe(2799);
  });

  it("never takes more than the products cost", () => {
    expect(discountAmountCents({ type: "FIXED", value: 500 }, 2799)).toBe(500);
    expect(discountAmountCents({ type: "FIXED", value: 5000 }, 2799)).toBe(2799);
  });
});

describe("discountRejection", () => {
  it("accepts a code without limits", () => {
    expect(discountRejection(rule, unused, 2799, now)).toBeNull();
  });

  it("refuses a code that is off, not started or over", () => {
    expect(discountRejection({ ...rule, active: false }, unused, 2799, now)).toBe("invalid");
    expect(discountRejection({ ...rule, startsAt: new Date("2026-11-03") }, unused, 2799, now)).toBe("invalid");
    expect(discountRejection({ ...rule, expiresAt: now }, unused, 2799, now)).toBe("invalid");
  });

  it("refuses a code that is used up, or that this e-mail already used", () => {
    const limited = { ...rule, maxRedemptions: 2 };
    expect(discountRejection(limited, { ...unused, redemptions: 1 }, 2799, now)).toBeNull();
    expect(discountRejection(limited, { ...unused, redemptions: 2 }, 2799, now)).toBe("invalid");
    const once = { ...rule, oncePerEmail: true };
    expect(discountRejection(once, { redemptions: 5, emailRedemptions: 0 }, 2799, now)).toBeNull();
    expect(discountRejection(once, { redemptions: 5, emailRedemptions: 1 }, 2799, now)).toBe("invalid");
  });

  it("names the minimum amount only for a code that is otherwise fine", () => {
    expect(discountRejection({ ...rule, minSubtotalCents: 3000 }, unused, 2799, now)).toBe("min_subtotal");
    expect(discountRejection({ ...rule, minSubtotalCents: 3000, active: false }, unused, 2799, now)).toBe("invalid");
    expect(discountRejection({ ...rule, minSubtotalCents: 2799 }, unused, 2799, now)).toBeNull();
  });
});

describe("discountState", () => {
  it("says where a code stands", () => {
    expect(discountState(rule, 0, now)).toBe("active");
    expect(discountState({ ...rule, active: false }, 0, now)).toBe("off");
    expect(discountState({ ...rule, expiresAt: now }, 0, now)).toBe("expired");
    expect(discountState({ ...rule, maxRedemptions: 1 }, 1, now)).toBe("used_up");
    expect(discountState({ ...rule, startsAt: new Date("2026-11-03") }, 0, now)).toBe("scheduled");
  });
});

describe("codes", () => {
  it("ignores case and surrounding spaces", () => {
    expect(normalizeDiscountCode("  welkom-10 ")).toBe("WELKOM-10");
  });

  it("generates codes the admin form would accept", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateDiscountCode();
      expect(code).toHaveLength(10);
      expect(code).toMatch(DISCOUNT_CODE_PATTERN);
    }
  });
});

describe("discountInputSchema", () => {
  const valid = {
    code: "welkom10",
    type: "PERCENTAGE",
    value: 10,
    minSubtotalCents: 0,
    maxRedemptions: null,
    oncePerEmail: false,
    startsAt: null,
    expiresAt: null,
    active: true,
    note: null,
  } as const;

  it("stores the code in capitals", () => {
    expect(discountInputSchema.parse(valid).code).toBe("WELKOM10");
  });

  it("refuses impossible values", () => {
    expect(discountInputSchema.safeParse({ ...valid, value: 101 }).success).toBe(false);
    expect(discountInputSchema.safeParse({ ...valid, value: 0 }).success).toBe(false);
    expect(discountInputSchema.safeParse({ ...valid, value: 1.5 }).success).toBe(false);
    expect(discountInputSchema.safeParse({ ...valid, code: "<script>" }).success).toBe(false);
    expect(discountInputSchema.safeParse({ ...valid, code: "ab" }).success).toBe(false);
    expect(
      discountInputSchema.safeParse({ ...valid, startsAt: "2026-12-02T00:00:00.000Z", expiresAt: "2026-11-02T00:00:00.000Z" }).success,
    ).toBe(false);
  });
});
