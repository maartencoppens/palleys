import "server-only";
import { z } from "zod";
import { prisma } from "@/db/client";
import { isPersonalDelivery } from "@/data/shipping";
import type { Prisma } from "@/db/generated/client";
import { createDownloadUrl } from "@/core/networking/external/storage-client";
import { tokenMatches } from "@/core/utils/tokens";
import { collectibleImageUrl } from "@/core/modules/collectibles/utils";
import { checkInItemOf, nextStepLabel, OPEN_ORDER_STATUSES, summarizeCheckIn } from "./check-in";
import { PAID_ORDER_STATUSES } from "./status";
import { invoiceCounterKey, ORDER_COUNTER_KEY, orderYear, palleyNameOf } from "./utils";
import { batchRef, invoiceNumber, orderRef } from "@/core/utils/naming";
import { nextCounterValue, type CounterClient } from "@/db/counters";
import { ORDER_START } from "@/data/naming";
import type { AdminOrderDetail, AdminOrderListItem, AdminOrderStats, OrderCheckInRow, OrderListQuery } from "./types";
import type { OrderStatusView } from "@/core/modules/checkout/types";

const ORDER_LIST_LIMIT = 100;

export class OrderNotFoundError extends Error {}

/** Next order number (PLY1042): one running counter. Call inside the order's transaction. */
export async function nextOrderNumber(tx: CounterClient) {
  return orderRef(await nextCounterValue(tx, ORDER_COUNTER_KEY, ORDER_START));
}

/** Next invoice number (F2026-0001) for the year of `date`. Call inside the transaction that marks the order paid. */
export async function nextInvoiceNumber(tx: CounterClient, date: Date = new Date()) {
  const year = orderYear(date);
  return invoiceNumber(year, await nextCounterValue(tx, invoiceCounterKey(year)));
}

// ---------- Customer (return page) ----------

/** Status for the return page. The token from the redirect URL is the only key; no personal data goes out. */
export async function getOrderStatusForCustomer(orderId: string, token: string | null): Promise<OrderStatusView | null> {
  if (!z.uuid().safeParse(orderId).success) return null;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      number: true,
      status: true,
      statusTokenHash: true,
      subtotalCents: true,
      discountCents: true,
      shippingCents: true,
      totalCents: true,
    },
  });
  // Same answer for "doesn't exist" and "wrong token", so ids can't be probed.
  if (!order || !tokenMatches(token, order.statusTokenHash)) return null;
  const { subtotalCents, discountCents, shippingCents, totalCents } = order;
  return { number: order.number, status: order.status, amounts: { subtotalCents, discountCents, shippingCents, totalCents } };
}

// ---------- Admin ----------

export async function listOrdersForAdmin(query: OrderListQuery): Promise<AdminOrderListItem[]> {
  const where: Prisma.OrderWhereInput = {};
  if (query.status === "ATTENTION") where.attentionReason = { not: null };
  else if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { number: { contains: query.q, mode: "insensitive" } },
      { email: { contains: query.q, mode: "insensitive" } },
      { firstName: { contains: query.q, mode: "insensitive" } },
      { lastName: { contains: query.q, mode: "insensitive" } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: ORDER_LIST_LIMIT,
    select: {
      id: true,
      number: true,
      status: true,
      firstName: true,
      lastName: true,
      email: true,
      createdBy: true,
      country: true,
      totalCents: true,
      attentionReason: true,
      createdAt: true,
      paidAt: true,
      shipment: { select: { deliveryType: true } },
      items: { select: { quantity: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, mode: true } },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    number: order.number,
    status: order.status,
    name: `${order.firstName} ${order.lastName}`,
    email: order.email,
    createdBy: order.createdBy,
    country: order.country,
    totalCents: order.totalCents,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    paymentStatus: order.payments[0]?.status ?? null,
    paymentMode: order.payments[0]?.mode ?? null,
    attention: order.attentionReason !== null,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    deliveryType: order.shipment?.deliveryType ?? null,
  }));
}

/** Paid orders that still have to leave, oldest first: the team's work list. */
export async function listOrdersForCheckIn(): Promise<OrderCheckInRow[]> {
  const orders = await prisma.order.findMany({
    where: { status: { in: OPEN_ORDER_STATUSES } },
    orderBy: { paidAt: "asc" },
    take: ORDER_LIST_LIMIT,
    select: {
      id: true,
      number: true,
      status: true,
      firstName: true,
      lastName: true,
      createdBy: true,
      paidAt: true,
      shipment: { select: { deliveryType: true } },
      batch: { select: { status: true } },
      items: { select: { checkedInAt: true, quantity: true, cancelledQuantity: true, preview: { select: { status: true } } } },
    },
  });
  return orders.map((order) => {
    const summary = summarizeCheckIn(order.items.map(checkInItemOf));
    const handover = isPersonalDelivery(order.shipment?.deliveryType);
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      name: `${order.firstName} ${order.lastName}`,
      createdBy: order.createdBy,
      paidAt: order.paidAt?.toISOString() ?? null,
      handover,
      summary,
      nextStep: nextStepLabel(order.status, summary, { handover, batchStatus: order.batch?.status ?? null }),
    };
  });
}

export async function getOrderStatsForAdmin(): Promise<AdminOrderStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [paidToday, pending, attention] = await Promise.all([
    prisma.order.aggregate({
      where: { paidAt: { gte: startOfDay }, status: { in: PAID_ORDER_STATUSES } },
      _count: { _all: true },
      _sum: { totalCents: true },
    }),
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.order.count({ where: { attentionReason: { not: null } } }),
  ]);
  return {
    paidToday: paidToday._count._all,
    revenueTodayCents: paidToday._sum.totalCents ?? 0,
    pending,
    attention,
  };
}

export async function getOrderForAdmin(id: string): Promise<AdminOrderDetail | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          preview: {
            select: {
              status: true,
              // Whoever uploaded them: on a manually added order that's the admin.
              photos: { orderBy: { createdAt: "asc" }, select: { key: true } },
            },
          },
          collectible: { select: { imageKey: true, modelKey: true } },
        },
      },
      payments: { orderBy: { createdAt: "desc" } },
      shipment: true,
      batch: { select: { id: true, number: true, status: true } },
      reprintOf: { select: { id: true, number: true } },
      reprints: { orderBy: { createdAt: "asc" }, select: { id: true, number: true } },
      statusChanges: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return null;

  const items = await Promise.all(
    order.items.map(async (item) => {
      const photoUrls = await Promise.all((item.preview?.photos ?? []).map((photo) => createDownloadUrl(photo.key)));
      return {
        id: item.id,
        kind: item.previewId ? ("personalized" as const) : ("collectible" as const),
        previewId: item.previewId,
        previewStatus: item.preview?.status ?? null,
        collectibleId: item.collectibleId,
        checkedInAt: item.checkedInAt?.toISOString() ?? null,
        checkedInBy: item.checkedInBy,
        title: item.title,
        productCode: item.productCode,
        // A Palley is only made once the order is paid.
        palleyName: PAID_ORDER_STATUSES.includes(order.status) ? palleyNameOf({ ...item, order }) : null,
        size: item.size,
        quantity: item.quantity,
        cancelledQuantity: item.cancelledQuantity,
        unitCents: item.unitCents,
        notes: item.notes,
        photoUrl: photoUrls[0] ?? collectibleImageUrl(item.collectible?.imageKey ?? null),
        photoUrls,
        attachment: item.attachment,
        collectibleHasModel: Boolean(item.collectible?.modelKey),
      };
    }),
  );

  return {
    id: order.id,
    number: order.number,
    invoiceNumber: order.invoiceNumber,
    batch: order.batch && { id: order.batch.id, ref: batchRef(order.batch.number), status: order.batch.status },
    reprintOf: order.reprintOf,
    reprints: order.reprints,
    status: order.status,
    createdBy: order.createdBy,
    email: order.email,
    firstName: order.firstName,
    lastName: order.lastName,
    phone: order.phone,
    address: order.street
      ? {
          street: order.street,
          houseNumber: order.houseNumber,
          postalCode: order.postalCode,
          city: order.city,
          country: order.country,
        }
      : null,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    discountCode: order.discountCode,
    shippingCents: order.shippingCents,
    vatCents: order.vatCents,
    totalCents: order.totalCents,
    termsVersion: order.termsVersion,
    termsAcceptedAt: order.termsAcceptedAt?.toISOString() ?? null,
    locale: order.locale,
    marketingOptIn: order.marketingOptIn,
    photoMarketingConsentAt: order.photoMarketingConsent ? (order.photoMarketingConsentAt?.toISOString() ?? null) : null,
    attentionReason: order.attentionReason,
    confirmationSentAt: order.confirmationSentAt?.toISOString() ?? null,
    paidAt: order.paidAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    items,
    payments: order.payments.map((payment) => ({
      id: payment.id,
      providerPaymentId: payment.providerPaymentId,
      provider: payment.provider,
      mode: payment.mode,
      method: payment.method,
      status: payment.status,
      amountCents: payment.amountCents,
      checkoutUrl: payment.status === "OPEN" ? payment.checkoutUrl : null,
      refundedCents: payment.refundedCents,
      chargedBackCents: payment.chargedBackCents,
      lastSyncedAt: payment.lastSyncedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    })),
    shipment: order.shipment && {
      label: order.shipment.label,
      carrier: order.shipment.carrier,
      deliveryType: order.shipment.deliveryType,
      priceCents: order.shipment.priceCents,
      trackingCode: order.shipment.trackingCode,
      trackingUrl: order.shipment.trackingUrl,
      shippedAt: order.shipment.shippedAt?.toISOString() ?? null,
      deliveredAt: order.shipment.deliveredAt?.toISOString() ?? null,
    },
    statusChanges: order.statusChanges.map((change) => ({
      fromStatus: change.fromStatus,
      toStatus: change.toStatus,
      source: change.source,
      note: change.note,
      createdAt: change.createdAt.toISOString(),
    })),
  };
}

/** Admin marks a flagged problem as handled. The reason and the note stay in the status log. */
export async function resolveOrderAttention(id: string, note: string, adminName: string) {
  const order = await prisma.order.findUnique({ where: { id }, select: { status: true, attentionReason: true } });
  if (!order) throw new OrderNotFoundError(id);
  if (!order.attentionReason) return { orderId: id };
  await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { attentionReason: null } }),
    prisma.orderStatusChange.create({
      data: {
        orderId: id,
        fromStatus: order.status,
        toStatus: order.status,
        source: `admin:${adminName}`,
        note: `Probleem afgehandeld: ${note} (was: ${order.attentionReason})`.slice(0, 1000),
      },
    }),
  ]);
  return { orderId: id };
}
