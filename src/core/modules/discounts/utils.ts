import { GENERATED_CODE_ALPHABET, GENERATED_CODE_LENGTH } from "@/data/discounts";
import type { DiscountType } from "@/db/generated/enums";
import { formatPrice } from "@/core/utils/format";

/* Pure discount rules: what a code is worth and whether it may be used right now. Amounts are integer cents. */

export type DiscountAmount = { type: DiscountType; value: number };

export type DiscountRule = DiscountAmount & {
  active: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  minSubtotalCents: number;
  maxRedemptions: number | null;
  oncePerEmail: boolean;
};

export type DiscountUsage = { redemptions: number; emailRedemptions: number };

export const normalizeDiscountCode = (code: string) => code.trim().toUpperCase();

/** What a code takes off the products. Never more than they cost, and shipping is never discounted. */
export function discountAmountCents({ type, value }: DiscountAmount, subtotalCents: number) {
  const amount = type === "PERCENTAGE" ? Math.round((subtotalCents * value) / 100) : value;
  return Math.min(amount, subtotalCents);
}

/**
 * Why a code can't be used, or null when it can. A customer only ever hears "invalid", whatever the reason, so a guess
 * says nothing about a code's dates or limits. The exception is a minimum amount: they need that to act on it.
 */
export function discountRejection(rule: DiscountRule, usage: DiscountUsage, subtotalCents: number, now = new Date()) {
  if (!rule.active) return "invalid";
  if (rule.startsAt && rule.startsAt > now) return "invalid";
  if (rule.expiresAt && rule.expiresAt <= now) return "invalid";
  if (rule.maxRedemptions !== null && usage.redemptions >= rule.maxRedemptions) return "invalid";
  if (rule.oncePerEmail && usage.emailRedemptions > 0) return "invalid";
  if (subtotalCents < rule.minSubtotalCents) return "min_subtotal";
  return null;
}

export function discountLabel({ type, value }: DiscountAmount) {
  if (value === 0) return "Geen korting";
  return type === "PERCENTAGE" ? `${value}%` : formatPrice(value / 100);
}

/** Where a code stands, for the admin's list. */
export function discountState(rule: DiscountRule, redemptions: number, now = new Date()) {
  if (!rule.active) return "off";
  if (rule.expiresAt && rule.expiresAt <= now) return "expired";
  if (rule.maxRedemptions !== null && redemptions >= rule.maxRedemptions) return "used_up";
  if (rule.startsAt && rule.startsAt > now) return "scheduled";
  return "active";
}

export function generateDiscountCode() {
  const alphabet = GENERATED_CODE_ALPHABET;
  // Rejection sampling: `byte % alphabet.length` alone would favour the first letters.
  const limit = 256 - (256 % alphabet.length);
  let code = "";
  while (code.length < GENERATED_CODE_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(GENERATED_CODE_LENGTH))) {
      if (byte < limit && code.length < GENERATED_CODE_LENGTH) code += alphabet[byte % alphabet.length];
    }
  }
  return code;
}
