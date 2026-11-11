import { z } from "zod";
import type { BatchStatus, OrderStatus, PaymentStatus, PreviewStatus } from "@/db/generated/enums";
import { animalSchema, attachmentSchema, editionSchema } from "@/core/modules/cart/types";
import { phoneSchema, safeText } from "@/core/modules/checkout/types";
import { FIELD_LIMITS, MAX_ADMIN_NOTES_LENGTH, MAX_NOTES_LENGTH } from "@/data/checkout";
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
  // A stock order: collectibles we have made ahead, for nobody in particular. The server fills in the rest (no customer,
  // no price, handed over, nothing to pay); finishing it adds the copies to the collectible's stock.
  stockOrder: z.boolean().default(false),
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
          edition: editionSchema.default("keychain"),
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
    z.object({ type: z.literal("link") }),
    z.object({ type: z.literal("later") }),
  ]),
  sendConfirmation: z.boolean(),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || undefined),
}).refine((input) => !input.stockOrder || input.lines.every((line) => line.kind === "collectible"), {
  path: ["lines"],
  message: "Een voorraadorder bevat alleen collectibles",
});

export const manualPaymentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paid"), method: z.enum(MANUAL_PAYMENT_METHODS), sendConfirmation: z.boolean() }),
  z.object({ type: z.literal("link") }),
]);

/** Deleting an order: the admin types its number and says why. Paid with real money: they confirm that too. */
export const deleteOrderSchema = z.object({
  confirmNumber: z.string().trim().min(1).max(40),
  reason: z.string().trim().min(5, "Geef een reden (minstens 5 tekens)").max(500),
  confirmPaid: z.boolean().default(false),
});
export type DeleteOrderInput = z.infer<typeof deleteOrderSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

/** What an admin can correct on an order: who, how to reach them, where it goes, the tracking code and line notes. */
export const orderDetailsSchema = z.object({
  firstName: safeText(FIELD_LIMITS.name),
  lastName: safeText(FIELD_LIMITS.name),
  email: z
    .email()
    .max(FIELD_LIMITS.email)
    .nullish()
    .or(z.literal(""))
    .transform((value) => value?.trim().toLowerCase() || null),
  phone: phoneSchema.transform((value) => value ?? null),
  address: z
    .object({
      street: safeText(FIELD_LIMITS.street),
      houseNumber: safeText(FIELD_LIMITS.houseNumber),
      postalCode: z.string().trim().regex(POSTAL_CODE_PATTERNS.BE, "Ongeldige postcode"),
      city: safeText(FIELD_LIMITS.city),
    })
    .nullable(),
  trackingCode: optionalText(100),
  itemNotes: z.record(z.uuid(), optionalText(MAX_NOTES_LENGTH)).default({}),
});
export type OrderDetailsInput = z.infer<typeof orderDetailsSchema>;

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

/** The team's notepad on an order. Empty clears it. */
export const orderNotesSchema = z.object({
  notes: z
    .string()
    .max(MAX_ADMIN_NOTES_LENGTH, `Maximaal ${MAX_ADMIN_NOTES_LENGTH} tekens`)
    .transform((value) => value.trim()),
});

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
  deliveryType: string | null;
};

export type AdminOrderDetail = {
  id: string;
  number: string;
  invoiceNumber: string | null;
  batch: { id: string; ref: string; status: BatchStatus } | null;
  /** A reprint after a warranty claim, and the order it reprints; or the reprints made for this one. */
  reprintOf: { id: string; number: string } | null;
  reprints: { id: string; number: string }[];
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
  /** May we use the photo and the Palley for marketing (art. 5.4); null = never given or withdrawn. */
  photoMarketingConsentAt: string | null;
  attentionReason: string | null;
  /** The team's notepad: never shown to the customer. */
  adminNotes: { text: string; updatedAt: string | null; updatedBy: string | null };
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
    productCode: string;
    /** PAL-PLY1042-01-P-RING-KAT once the order is paid. */
    palleyName: string | null;
    size: string;
    quantity: number;
    /** Copies cancelled or withdrawn before they left (an approved return request): not made. */
    cancelledQuantity: number;
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
    shippedAt: string | null;
    /** Filled in by the team; empty = the estimate in returns/utils.ts. */
    deliveredAt: string | null;
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
