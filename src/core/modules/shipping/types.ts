import { z } from "zod";
import { POSTAL_CODE_PATTERNS, SHIPPING_COUNTRY_CODES, type DeliveryType } from "@/data/shipping";

export const deliveryAddressSchema = z
  .object({
    country: z.enum(SHIPPING_COUNTRY_CODES),
    // Not known yet when the checkout opens. A carrier that prices by postal code gets asked again once it is.
    postalCode: z.string().trim().max(10).optional().transform((value) => value || undefined),
  })
  .refine((value) => !value.postalCode || POSTAL_CODE_PATTERNS[value.country].test(value.postalCode), {
    path: ["postalCode"],
    message: "Invalid postal code",
  });

export type DeliveryAddress = z.input<typeof deliveryAddressSchema>;

/** One way to deliver, as the checkout shows it. The price is ours, never the client's. */
export type DeliveryOption = {
  id: string;
  provider: string;
  carrier: string;
  deliveryType: DeliveryType;
  label: string;
  eta: string;
  priceCents: number;
};
