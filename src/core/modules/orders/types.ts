import { z } from "zod";
import type { OrderStatus, PaymentStatus, PreviewStatus } from "@/db/generated/enums";
import { animalSchema, attachmentSchema, editionSchema } from "@/core/modules/cart/types";
import { phoneSchema, safeText } from "@/core/modules/checkout/types";
import { FIELD_LIMITS, MAX_NOTES_LENGTH } from "@/data/checkout";
import { MANUAL_PAYMENT_METHODS } from "@/data/payment-methods";
import { MAX_LINE_QUANTITY, MAX_ORDER_LINES, MAX_PRODUCT_PRICE_CENTS } from "@/data/pricing";
import { MAX_SHIPPING_PRICE_CENTS, POSTAL_CODE_PATTERNS } from "@/data/shipping";
import type { CheckInSummary } from "./check-in";

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "IN_PRODUCTION",
  "SHIPPED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
] as const satisfies readonly OrderStatus[];

export const orderListQuerySchema = z.object({
  status: z.enum([...ORDER_STATUSES, "ATTENTION"]).optional(),
  q: z.string().trim().max(200).optional(),
});

export const resolveAttentionSchema = z.object({ note: z.string().trim().min(3).max(500) });

const optionalNote = z
  .string()
  .trim()
  .max(MAX_NOTES_LENGTH)
  .optional()
  .transform((value) => value || null);

// An admin may change a line's price (a friend's price, a gift), so here, unlike the checkout, the client can send one.
const lineQuantity = z.number().int().min(1).max(MAX_LINE_QUANTITY);
const lineUnitCents = z.number().int().min(0).max(MAX_PRODUCT_PRICE_CENTS).optional();

export const manualOrderSchema = z.object({
  customer: z.object({
    // Optional: a friend you hand it to doesn't need a confirmation mail.
    email: z
      .union([z.literal(""), z.email().max(FIELD_LIMITS.email)])
      .optional()
      .transform((value) => value?.trim().toLowerCase() || null),
    firstName: safeText(FIELD_LIMITS.name),
    lastName: safeText(FIELD_LIMITS.name),
    phone: phoneSchema,
  }),
  lines: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("personalized"),
          animal: animalSchema,
          edition: editionSchema,
          attachment: attachmentSchema.optional(),
          quantity: lineQuantity,
          unitCents: lineUnitCents,
          notes: optionalNote,
        }),
        z.object({
          kind: z.literal("collectible"),
          collectibleId: z.uuid(),
          attachment: attachmentSchema.optional(),
          quantity: lineQuantity,
          unitCents: lineUnitCents,
          notes: optionalNote,
        }),
      ]),
    )
    .min(1)
    .max(MAX_ORDER_LINES),
  delivery: z.discriminatedUnion("type", [
    z.object({ type: z.literal("handover") }),
    z.object({
      type: z.literal("ship"),
      optionId: z.string().min(1).max(100),
      priceCents: z.number().int().min(0).max(MAX_SHIPPING_PRICE_CENTS).optional(),
      street: safeText(FIELD_LIMITS.street),
      houseNumber: safeText(FIELD_LIMITS.houseNumber),
      postalCode: z.string().trim().regex(POSTAL_CODE_PATTERNS.BE, "Invalid postal code"),
      city: safeText(FIELD_LIMITS.city),
    }),
  ]),
  payment: z.discriminatedUnion("type", [
    z.object({ type: z.literal("paid"), method: z.enum(MANUAL_PAYMENT_METHODS) }),
    z.object({ type: z.literal("bancontact") }),
    z.object({ type: z.literal("later") }),
  ]),
  sendConfirmation: z.boolean(),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || undefined),
});

export const manualPaymentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paid"), method: z.enum(MANUAL_PAYMENT_METHODS), sendConfirmation: z.boolean() }),
  z.object({ type: z.literal("bancontact") }),
]);

export const orderStatusActionSchema = z.object({
  status: z.enum(["IN_PRODUCTION", "SHIPPED", "CANCELLED", "REFUNDED"]),
  trackingCode: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || undefined),
});

export const itemCheckInSchema = z.object({ checked: z.boolean() });

export type ManualOrderInput = z.infer<typeof manualOrderSchema>;
// What the form sends, before the schema's transforms fill in the defaults.
export type ManualOrderRequest = z.input<typeof manualOrderSchema>;
export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>;
export type OrderStatusActionInput = z.input<typeof orderStatusActionSchema>;

export type ManualOrderResult = {
  orderId: string;
  number: string;
  /** The preview of each personalised line, for uploading its photos. */
  previews: { lineIndex: number; previewId: string }[];
  paymentLinkFailed: boolean;
};

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export type AdminOrderListItem = {
  id: string;
  number: string;
  status: OrderStatus;
  name: string;
  email: string | null;
  createdBy: string | null;
  country: string;
  totalCents: number;
  itemCount: number;
  paymentStatus: PaymentStatus | null;
  paymentMode: string | null;
  attention: boolean;
  createdAt: string;
  paidAt: string | null;
};

export type AdminOrderDetail = {
  id: string;
  number: string;
  status: OrderStatus;
  createdBy: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: { street: string; houseNumber: string | null; postalCode: string | null; city: string | null; country: string } | null;
  subtotalCents: number;
  discountCents: number;
  discountCode: string | null;
  shippingCents: number;
  vatCents: number;
  totalCents: number;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  locale: string;
  marketingOptIn: boolean;
  attentionReason: string | null;
  confirmationSentAt: string | null;
  paidAt: string | null;
  createdAt: string;
  items: {
    id: string;
    kind: "personalized" | "collectible";
    previewId: string | null;
    previewStatus: PreviewStatus | null;
    collectibleId: string | null;
    checkedInAt: string | null;
    checkedInBy: string | null;
    title: string;
    sku: string;
    size: string;
    quantity: number;
    unitCents: number;
    notes: string | null;
    photoUrl: string | null;
    attachment: string | null;
    photoUrls: string[]; // de foto's van een gepersonaliseerde Palley, leeg bij een collectible
    /** A collectible is printed from its own stored model; false when nobody uploaded one yet. */
    collectibleHasModel: boolean;
  }[];
  payments: {
    id: string;
    providerPaymentId: string;
    provider: string;
    mode: string | null;
    method: string | null;
    status: PaymentStatus;
    amountCents: number;
    checkoutUrl: string | null;
    refundedCents: number;
    chargedBackCents: number;
    lastSyncedAt: string | null;
    createdAt: string;
  }[];
  shipment: {
    label: string;
    carrier: string;
    deliveryType: string;
    priceCents: number;
    trackingCode: string | null;
    trackingUrl: string | null;
  } | null;
  statusChanges: { fromStatus: OrderStatus | null; toStatus: OrderStatus; source: string; note: string | null; createdAt: string }[];
};

/** An order the team still has to finish, for the check-in overview on the dashboard. */
export type OrderCheckInRow = {
  id: string;
  number: string;
  status: OrderStatus;
  name: string;
  createdBy: string | null;
  paidAt: string | null;
  handover: boolean;
  summary: CheckInSummary;
  nextStep: string;
};

export type AdminOrderStats = {
  paidToday: number;
  revenueTodayCents: number;
  pending: number;
  attention: number;
};
