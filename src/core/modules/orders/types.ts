import { z } from "zod";

/*
 * The part of Shopify's orders/paid webhook payload (REST order format) we use.
 * Zod drops every other field, so customer addresses etc. never pass beyond this point.
 */
export const orderPaidPayloadSchema = z.object({
  id: z.number(),
  admin_graphql_api_id: z.string(),
  order_number: z.number(),
  email: z.string().nullish(),
  contact_email: z.string().nullish(),
  line_items: z.array(
    z.object({
      id: z.number(),
      sku: z.string().nullish(),
      properties: z
        .array(z.object({ name: z.string(), value: z.unknown() }))
        .nullish(),
    }),
  ),
});

export type OrderPaidPayload = z.infer<typeof orderPaidPayloadSchema>;

export type OrderPaidResult = {
  orderId: string;
  paid: string[]; // preview IDs marked PAID now
  duplicates: string[]; // already PAID for this line (webhook retry)
  problems: { previewId: string; reason: string }[];
};
