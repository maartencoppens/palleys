import { z } from "zod";
import { DEFAULT_LOCALE, LOCALES } from "@/core/locale/config";
import { FIELD_LIMITS } from "@/data/checkout";
import { POSTAL_CODE_PATTERNS, SHIPPING_COUNTRY_CODES } from "@/data/shipping";
import { enteredDiscountCodeSchema } from "@/core/modules/discounts/types";
import type { DeliveryOption } from "@/core/modules/shipping/types";

// Only needed for a parcel: the service checks that once it knows the delivery option.
const optionalAddressText = (max: number) =>
  z.string().trim().optional().transform((value) => value || undefined).pipe(safeText(max).optional());

const text = (max: number) => z.string().trim().min(1).max(max);
// No HTML-ish characters in names and addresses: they end up in e-mails and on labels.
export const safeText = (max: number) => text(max).regex(/^[^<>{}\\]*$/, "Invalid characters");

export const phoneSchema = z
  .string()
  .trim()
  .max(FIELD_LIMITS.phone)
  .regex(/^[+0-9 ()./-]*$/, "Invalid phone number")
  .optional()
  .transform((value) => value || undefined);

// The client sends who and where, which delivery option, and that the terms were accepted. Never an amount:
// items come from the cart cookie and every price is computed on the server.
export const checkoutSchema = z
  .object({
    email: z.email().max(FIELD_LIMITS.email).transform((value) => value.trim().toLowerCase()),
    firstName: safeText(FIELD_LIMITS.name),
    lastName: safeText(FIELD_LIMITS.name),
    phone: phoneSchema,
    street: optionalAddressText(FIELD_LIMITS.street),
    houseNumber: optionalAddressText(FIELD_LIMITS.houseNumber),
    postalCode: z.string().trim().max(10).optional().transform((value) => value || undefined),
    city: optionalAddressText(FIELD_LIMITS.city),
    country: z.enum(SHIPPING_COUNTRY_CODES),
    deliveryOptionId: z.string().min(1).max(100),
    // Only the code: what it's worth is worked out on the server.
    discountCode: enteredDiscountCodeSchema.optional(),
    // LEGAL-REVIEW: must be an explicit, unticked-by-default checkbox in the form.
    acceptTerms: z.literal(true),
    marketingOptIn: z.boolean().default(false),
    locale: z.enum(LOCALES).default(DEFAULT_LOCALE),
  })
  .refine((value) => !value.postalCode || POSTAL_CODE_PATTERNS[value.country].test(value.postalCode), {
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
