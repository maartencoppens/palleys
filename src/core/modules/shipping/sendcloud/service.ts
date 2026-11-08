import "server-only";
import { prisma } from "@/db/client";
import { moveOrder } from "@/core/modules/payments/service";
import { isHandedOver, orderNumberOf } from "./utils";
import { parcelStatusChangedSchema, type SendcloudWebhookResult } from "./types";

const SOURCE = "webhook:sendcloud";

/**
 * A parcel's new status from Sendcloud: the tracking code and link go on the order's shipment, the status into the
 * order's log, and once the carrier has the parcel the order moves to SHIPPED. Older updates than the one we have
 * are skipped (webhooks don't always arrive in order), so a retry or a late one changes nothing.
 */
export async function handleSendcloudWebhook(payload: unknown): Promise<SendcloudWebhookResult> {
  const action = typeof payload === "object" && payload && "action" in payload ? String(payload.action) : "unknown";
  if (action !== "parcel_status_changed") return { outcome: "other_action", action };

  const parsed = parcelStatusChangedSchema.safeParse(payload);
  if (!parsed.success) return { outcome: "ignored" };
  const { parcel, timestamp } = parsed.data;
  if (parcel.is_return) return { outcome: "return" };

  const number = orderNumberOf(parcel);
  const order = number
    ? await prisma.order.findUnique({
        where: { number },
        select: { id: true, status: true, shipment: { select: { providerStatusAt: true, providerStatus: true, shippedAt: true } } },
      })
    : null;
  if (!order?.shipment) return { outcome: "unknown_order" };

  const statusAt = new Date(timestamp * 1000);
  const { shipment } = order;
  if (shipment.providerStatusAt && shipment.providerStatusAt >= statusAt) return { outcome: "stale" };

  const message = parcel.status.message.trim();
  const handedOver = isHandedOver(message);
  await prisma.shipment.update({
    where: { orderId: order.id },
    data: {
      provider: "sendcloud",
      providerShipmentId: String(parcel.id),
      trackingCode: parcel.tracking_number || undefined,
      trackingUrl: parcel.tracking_url || undefined,
      providerStatus: message,
      providerStatusAt: statusAt,
      ...(handedOver && !shipment.shippedAt && { shippedAt: statusAt }),
    },
  });

  const moved = handedOver && (await moveOrder(order.id, "SHIPPED", SOURCE, `Sendcloud: ${message}`));
  if (!moved && message !== shipment.providerStatus) {
    // The status itself in the order's history, without changing the order (e.g. "Delivered" on a shipped order).
    await prisma.orderStatusChange.create({
      data: { orderId: order.id, fromStatus: order.status, toStatus: order.status, source: SOURCE, note: `Sendcloud: ${message}`.slice(0, 1000) },
    });
  }
  return { outcome: moved ? "shipped" : "updated" };
}
