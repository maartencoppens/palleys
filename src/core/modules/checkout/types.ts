import { z } from "zod";
import { CHECKOUT_LOCALES, FIELD_LIMITS } from "@/data/checkout";
import { POSTAL_CODE_PATTERNS, SHIPPING_COUNTRY_CODES } from "@/data/shipping";
import type { DeliveryOption } from "@/core/modules/shipping/types";

const text = (max: number) => z.string().trim().min(1).max(max);
// No HTML-ish characters in names and addresses: they end up in e-mails and on labels.
const safeText = (max: number) => text(max).regex(/^[^<>{}\\]*$/, "Invalid characters");

// The client sends who and where, which delivery option, and that the terms were accepted. Never an amount:
// items come from the cart cookie and every price is computed on the server.
export const checkoutSchema = z
  .object({
    email: z.email().max(FIELD_LIMITS.email).transform((value) => value.trim().toLowerCase()),
    firstName: safeText(FIELD_LIMITS.name),
    lastName: safeText(FIELD_LIMITS.name),
    phone: z
      .string()
      .trim()
      .max(FIELD_LIMITS.phone)
      .regex(/^[+0-9 ()./-]*$/, "Invalid phone number")
      .optional()
      .transform((value) => value || undefined),
    street: safeText(FIELD_LIMITS.street),
    houseNumber: safeText(FIELD_LIMITS.houseNumber),
    postalCode: z.string().trim().max(10),
    city: safeText(FIELD_LIMITS.city),
    country: z.enum(SHIPPING_COUNTRY_CODES),
    deliveryOptionId: z.string().min(1).max(100),
    // LEGAL-REVIEW: must be an explicit, unticked-by-default checkbox in the form.
    acceptTerms: z.literal(true),
    marketingOptIn: z.boolean().default(false),
    locale: z.enum(CHECKOUT_LOCALES).default("nl"),
  })
  .refine((value) => POSTAL_CODE_PATTERNS[value.country].test(value.postalCode), {
    path: ["postalCode"],
    message: "Invalid postal code",
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type CheckoutConfig = {
  enabled: boolean;
  closedMessage: string | null;
  paymentsAvailable: boolean;
};

export type DeliveryOptionView = Omit<DeliveryOption, "checkoutIdentifier" | "provider">;

export type CheckoutResult = { checkoutUrl: string };

export type OrderStatusView = {
  number: string;
  status: "PENDING_PAYMENT" | "PAID" | "IN_PRODUCTION" | "SHIPPED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
};
