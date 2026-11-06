import { z } from "zod";
import {
  DISCOUNT_CODE_MAX_LENGTH,
  DISCOUNT_CODE_PATTERN,
  DISCOUNT_NOTE_MAX_LENGTH,
  MAX_DISCOUNT_REDEMPTIONS,
  MAX_FIXED_DISCOUNT_CENTS,
} from "@/data/discounts";
import { normalizeDiscountCode } from "./utils";

/** What a customer types. Length only: anything we don't have is simply not found, like any other wrong guess. */
export const enteredDiscountCodeSchema = z.string().max(DISCOUNT_CODE_MAX_LENGTH + 8).transform(normalizeDiscountCode);

export const applyDiscountSchema = z.object({ code: enteredDiscountCodeSchema });

const optionalDate = z.iso.datetime().nullish().transform((value) => (value ? new Date(value) : null));

export const discountInputSchema = z
  .object({
    code: z
      .string()
      .transform(normalizeDiscountCode)
      .refine((code) => DISCOUNT_CODE_PATTERN.test(code), "Een code heeft 3 tot 32 letters, cijfers of streepjes"),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    value: z.number().int().min(0),
    minSubtotalCents: z.number().int().min(0).max(MAX_FIXED_DISCOUNT_CENTS),
    maxRedemptions: z.number().int().min(1).max(MAX_DISCOUNT_REDEMPTIONS).nullable(),
    oncePerEmail: z.boolean(),
    personalDelivery: z.boolean().default(false),
    startsAt: optionalDate,
    expiresAt: optionalDate,
    active: z.boolean(),
    note: z
      .string()
      .trim()
      .max(DISCOUNT_NOTE_MAX_LENGTH)
      .nullish()
      .transform((value) => value || null),
  })
  .refine((value) => value.value > 0 || value.personalDelivery, {
    path: ["value"],
    message: "Een code zonder korting moet gratis persoonlijk overhandigen geven",
  })
  .refine((value) => value.type !== "PERCENTAGE" || value.value <= 100, {
    path: ["value"],
    message: "Een percentage kan niet hoger zijn dan 100",
  })
  .refine((value) => value.type !== "FIXED" || value.value <= MAX_FIXED_DISCOUNT_CENTS, {
    path: ["value"],
    message: "Dat bedrag is te hoog",
  })
  .refine((value) => !value.startsAt || !value.expiresAt || value.startsAt < value.expiresAt, {
    path: ["expiresAt"],
    message: "De einddatum moet na de startdatum liggen",
  });

export type DiscountInput = z.input<typeof discountInputSchema>;

/** What the checkout shows after applying a code. */
export type AppliedDiscount = { code: string; label: string; discountCents: number };

export type AdminDiscount = {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  label: string;
  minSubtotalCents: number;
  maxRedemptions: number | null;
  oncePerEmail: boolean;
  personalDelivery: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
  note: string | null;
  state: "active" | "off" | "expired" | "used_up" | "scheduled";
  redemptions: number;
  /** Total taken off orders that were really paid. */
  paidDiscountCents: number;
};
