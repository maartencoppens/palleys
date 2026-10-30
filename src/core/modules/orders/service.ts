import "server-only";
import { prisma } from "@/db/client";
import { assertValidWebhook } from "@/core/networking/external/shopify-client";
import { statusesThatCanTransitionTo } from "@/core/modules/previews/status";
import { addOrderTags } from "@/core/modules/shopify/admin";
import { ORDER_PROBLEM_TAG } from "@/data/shopify";
import { orderPaidPayloadSchema, type OrderPaidResult } from "./types";
import { animalTypeFromSku, previewIdOf } from "./utils";

/*
 * orders/paid: links each paid line item back to its preview and moves it UPLOADED → PAID, together
 * with how many copies were ordered.
 * Safe to receive twice (Shopify retries): a preview already paid for the same line is a no-op.
 * Anything that doesn't add up is logged and tagged on the order, so it shows up in the Shopify admin.
 */
export async function handleOrderPaidWebhook(input: {
  rawBody: string;
  hmac: string | null;
}): Promise<OrderPaidResult> {
  assertValidWebhook(input.rawBody, input.hmac);
  const order = orderPaidPayloadSchema.parse(JSON.parse(input.rawBody));

  const orderId = String(order.id);
  const email = order.email || order.contact_email || null;
  const result: OrderPaidResult = { orderId, paid: [], duplicates: [], problems: [] };
  const paidAt = new Date();

  for (const line of order.line_items) {
    const previewId = previewIdOf(line.properties);
    if (!previewId) continue; // not a custom Palley
    const lineItemId = String(line.id);

    const updated = await prisma.preview.updateMany({
      where: { id: previewId, status: { in: statusesThatCanTransitionTo("PAID") } },
      data: {
        status: "PAID",
        shopifyOrderId: orderId,
        shopifyOrderNumber: String(order.order_number),
        shopifyLineItemId: lineItemId,
        quantity: line.quantity,
        email,
        paidAt,
        expiresAt: null, // paid previews no longer expire; photos go after shipping (photosDeleteAt)
      },
    });

    if (updated.count === 1) {
      // Prefill the animal the customer picked, unless an admin already chose one.
      const animalType = animalTypeFromSku(line.sku);
      if (animalType) {
        await prisma.preview.updateMany({
          where: { id: previewId, animalType: null },
          data: { animalType },
        });
      }
      result.paid.push(previewId);
      continue;
    }

    const preview = await prisma.preview.findUnique({
      where: { id: previewId },
      select: { status: true, shopifyLineItemId: true },
    });
    if (preview?.shopifyLineItemId === lineItemId) {
      result.duplicates.push(previewId);
    } else {
      result.problems.push({
        previewId,
        reason: preview ? `status ${preview.status}` : "preview not found",
      });
    }
  }

  if (result.problems.length > 0) {
    console.error(`Order ${orderId}: previews not marked as paid`, result.problems);
    try {
      await addOrderTags(order.admin_graphql_api_id, [ORDER_PROBLEM_TAG]);
    } catch (error) {
      // Tagging is a convenience; the log above is the source of truth.
      console.error("Tagging order failed:", error instanceof Error ? error.message : error);
    }
  }
  return result;
}
