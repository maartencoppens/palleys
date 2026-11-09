import { z } from "zod";
import type { OrderStatus, ReturnResolution, ReturnStatus, ReturnType } from "@/db/generated/enums";
import { photoInputSchema } from "@/core/modules/previews/types";
import { isOrderRef } from "@/core/utils/naming";
import { FIELD_LIMITS } from "@/data/checkout";
import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from "@/data/pricing";
import {
  MAX_DECISION_NOTE_LENGTH,
  MAX_RETURN_PHOTOS,
  MAX_RETURN_REASON_LENGTH,
  MIN_RETURN_PHOTOS,
  MIN_WARRANTY_DESCRIPTION_LENGTH,
} from "@/data/returns";
import type { CalendarDay, ItemReturnOptions, ReceivedOn } from "./utils";
import { normalizeOrderNumber } from "./utils";

export const RETURN_TYPES = ["CANCELLATION", "WITHDRAWAL", "WARRANTY"] as const satisfies readonly ReturnType[];
export const RETURN_RESOLUTIONS = ["REPRINT", "REFUND"] as const satisfies readonly ReturnResolution[];

// ---------- Customer ----------

/** The lookup form. Whether the order exists is never part of the answer. */
export const returnLookupSchema = z.object({
  orderNumber: z.string().max(40).transform(normalizeOrderNumber).refine(isOrderRef, "Invalid order number"),
  email: z.string().trim().toLowerCase().pipe(z.email().max(FIELD_LIMITS.email)),
  locale: z.string().max(5).optional(),
});
export type ReturnLookupInput = z.infer<typeof returnLookupSchema>;

/** The one-time token from the mail, exchanged for a session. */
export const returnSessionSchema = z.object({ token: z.string().min(20).max(128) });

export const returnPhotoUploadSchema = z.object({
  photos: z.array(photoInputSchema).min(MIN_RETURN_PHOTOS).max(MAX_RETURN_PHOTOS),
});
export type ReturnPhotoUploadInput = z.infer<typeof returnPhotoUploadSchema>;

const reason = z
  .string()
  .trim()
  .max(MAX_RETURN_REASON_LENGTH)
  .optional()
  .transform((value) => value || null);

const items = z
  .array(z.object({ orderItemId: z.uuid(), quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY) }))
  .min(1)
  .max(MAX_ORDER_LINES)
  .refine((lines) => new Set(lines.map((line) => line.orderItemId)).size === lines.length, "Duplicate item");

export const returnSubmitSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CANCELLATION"), items, reason }),
  z.object({ type: z.literal("WITHDRAWAL"), items, reason }),
  z.object({
    type: z.literal("WARRANTY"),
    items,
    reason: z.string().trim().min(MIN_WARRANTY_DESCRIPTION_LENGTH).max(MAX_RETURN_REASON_LENGTH),
    photoKeys: z.array(z.string().min(1).max(300)).min(MIN_RETURN_PHOTOS).max(MAX_RETURN_PHOTOS),
    resolution: z.enum(RETURN_RESOLUTIONS),
  }),
]);
export type ReturnSubmitInput = z.infer<typeof returnSubmitSchema>;
export type ReturnSubmitRequest = z.input<typeof returnSubmitSchema>;

/** How an item stands, in the customer's words. */
export type ReturnItemStatus = "paid" | "in_production" | "sent" | "picked_up" | "refunded" | "cancelled" | "request_open";

export type ReturnItemView = {
  id: string;
  kind: "personalized" | "collectible";
  title: string;
  quantity: number;
  imageUrl: string | null;
  status: ReturnItemStatus;
  options: ItemReturnOptions;
};

export type ReturnLineView = { title: string; quantity: number };

export type ReturnRequestView = {
  id: string;
  type: ReturnType;
  status: ReturnStatus;
  submittedAt: string;
  items: ReturnLineView[];
  resolution: ReturnResolution | null;
  /** The reason a request was turned down. */
  decisionNote: string | null;
};

export type ReturnOverview = {
  orderNumber: string;
  firstName: string;
  orderStatus: OrderStatus;
  receivedOn: ReceivedOn | null;
  items: ReturnItemView[];
  requests: ReturnRequestView[];
  /** Where a withdrawn Palley goes back to; empty until it's set in the company settings. */
  returnAddress: string;
  companyEmail: string;
};

/** What the customer sees (and gets by mail) right after sending a request. */
export type ReturnReceipt = {
  id: string;
  type: ReturnType;
  submittedAt: string;
  items: ReturnLineView[];
  reason: string | null;
  resolution: ReturnResolution | null;
  /** Withdrawal of Palleys the customer already has: they send them back. */
  itemsReceived: boolean;
  returnBy: CalendarDay | null;
  returnAddress: string;
  photoCount: number;
};

// ---------- Admin ----------

export const returnDecisionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), note: z.string().trim().min(5, "Geef een reden (minstens 5 tekens)").max(MAX_DECISION_NOTE_LENGTH) }),
  z.object({ action: z.literal("complete") }),
]);
export type ReturnDecisionInput = z.infer<typeof returnDecisionSchema>;

/** The real delivery date of a parcel, filled in by the team; null goes back to the estimate. */
export const deliveredOnSchema = z.object({
  deliveredOn: z.iso.date().nullable(),
});

export type AdminReturnRequest = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  type: ReturnType;
  status: ReturnStatus;
  resolution: ReturnResolution | null;
  reason: string | null;
  itemsReceived: boolean;
  submittedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  completedAt: string | null;
  completedBy: string | null;
  decisionNote: string | null;
  items: { orderItemId: string; title: string; productCode: string; quantity: number }[];
  /** Signed URLs, valid for a few minutes. */
  photoUrls: string[];
  reprintOrder: { id: string; number: string } | null;
};
