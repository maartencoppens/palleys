import { z } from "zod";

/*
 * What we read from a Sendcloud webhook (sendcloud.dev/.openapi/v3/webhooks/openapi.yaml). Only these fields; the
 * rest of the parcel (the customer's address, among others) is never stored. Unknown actions pass as `other`.
 */
const parcelSchema = z.object({
  id: z.number().int(),
  tracking_number: z.string().nullish(),
  tracking_url: z.string().nullish(),
  status: z.object({ id: z.number().int(), message: z.string() }),
  order_number: z.string().nullish(),
  external_order_id: z.string().nullish(),
  is_return: z.boolean().nullish(),
  carrier: z.object({ code: z.string().nullish() }).nullish(),
});

export const parcelStatusChangedSchema = z.object({
  action: z.literal("parcel_status_changed"),
  // Unix seconds: when the status changed. Webhooks can arrive out of order.
  timestamp: z.number(),
  parcel: parcelSchema,
});

export type ParcelStatusChanged = z.infer<typeof parcelStatusChangedSchema>;

export type SendcloudWebhookResult =
  | { outcome: "updated" | "shipped" | "stale" | "unknown_order" | "return" | "ignored" }
  | { outcome: "other_action"; action: string };
