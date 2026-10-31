import { z } from "zod";
import { POSTAL_CODE_PATTERNS, SHIPPING_COUNTRY_CODES, type DeliveryType } from "@/data/shipping";

export const deliveryAddressSchema = z
  .object({
    country: z.enum(SHIPPING_COUNTRY_CODES),
    postalCode: z.string().trim().max(10),
  })
  .refine((value) => POSTAL_CODE_PATTERNS[value.country].test(value.postalCode), {
    path: ["postalCode"],
    message: "Invalid postal code",
  });

export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;

/** One way to deliver, as the checkout shows it. The price is ours (VAT included), never the client's. */
export type DeliveryOption = {
  id: string;
  provider: string;
  carrier: string;
  deliveryType: DeliveryType;
  label: string;
  eta: string;
  priceCents: number;
  /** Sendcloud Dynamic Checkout identifier, needed later to create the shipment. Null for the static provider. */
  checkoutIdentifier: string | null;
};
