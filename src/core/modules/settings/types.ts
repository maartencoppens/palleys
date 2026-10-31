import { z } from "zod";
import { MAX_SHIPPING_PRICE_CENTS, STATIC_DELIVERY_OPTIONS } from "@/data/shipping";

const optionIds = STATIC_DELIVERY_OPTIONS.map((option) => option.id) as [string, ...string[]];

export const shippingOverrideSchema = z.object({
  priceCents: z.number().int().min(0).max(MAX_SHIPPING_PRICE_CENTS),
  enabled: z.boolean(),
});

export const shopSettingsSchema = z.object({
  checkoutEnabled: z.boolean(),
  checkoutClosedMessage: z.string().trim().max(300).nullable(),
  shippingOverrides: z.partialRecord(z.enum(optionIds), shippingOverrideSchema),
});

export type ShippingOverride = z.infer<typeof shippingOverrideSchema>;
export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>;

export type ShopSettings = ShopSettingsInput & {
  updatedBy: string | null;
  updatedAt: string | null;
};
