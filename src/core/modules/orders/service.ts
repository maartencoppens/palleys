import "server-only";
import { z } from "zod";
import { prisma } from "@/db/client";
import type { Prisma } from "@/db/generated/client";
import { createDownloadUrl } from "@/core/networking/external/storage-client";
import { tokenMatches } from "@/core/utils/tokens";
import { PAID_ORDER_STATUSES } from "./status";
import type { AdminOrderDetail, AdminOrderListItem, AdminOrderStats, OrderListQuery } from "./types";
import type { OrderStatusView } from "@/core/modules/checkout/types";

const ORDER_LIST_LIMIT = 100;

export class OrderNotFoundError extends Error {}

// ---------- Customer (return page) ----------

/** Status for the return page. The token from the redirect URL is the only key; no personal data goes out. */
export async function getOrderStatusForCustomer(orderId: string, token: string | null): Promise<OrderStatusView | null> {
  if (!z.uuid().safeParse(orderId).success) return null;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { number: true, status: true, statusTokenHash: true },
  });
  // Same answer for "doesn't exist" and "wrong token", so ids can't be probed.
  if (!order || !tokenMatches(token, order.statusTokenHash)) return null;
  return { number: order.number, status: order.status };
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
      country: true,
      totalCents: true,
      attentionReason: true,
      createdAt: true,
      paidAt: true,
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
    country: order.country,
    totalCents: order.totalCents,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    paymentStatus: order.payments[0]?.status ?? null,
    paymentMode: order.payments[0]?.mode ?? null,
    attention: order.attentionReason !== null,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
  }));
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
        include: {
          preview: {
            select: {
              status: true,
              photos: { where: { uploadedBy: null }, orderBy: { createdAt: "asc" }, take: 1, select: { key: true } },
            },
          },
        },
      },
      payments: { orderBy: { createdAt: "desc" } },
      shipment: true,
      statusChanges: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return null;

  const items = await Promise.all(
    order.items.map(async (item) => {
      const key = item.preview.photos[0]?.key;
      return {
        id: item.id,
        previewId: item.previewId,
        previewStatus: item.preview.status,
        title: item.title,
        sku: item.sku,
        size: item.size,
        quantity: item.quantity,
        unitCents: item.unitCents,
        notes: item.notes,
        photoUrl: key ? await createDownloadUrl(key) : null,
      };
    }),
  );

  return {
    id: order.id,
    number: order.number,
    status: order.status,
    email: order.email,
    firstName: order.firstName,
    lastName: order.lastName,
    phone: order.phone,
    address: {
      street: order.street,
      houseNumber: order.houseNumber,
      postalCode: order.postalCode,
      city: order.city,
      country: order.country,
    },
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    vatCents: order.vatCents,
    totalCents: order.totalCents,
    termsVersion: order.termsVersion,
    termsAcceptedAt: order.termsAcceptedAt.toISOString(),
    locale: order.locale,
    marketingOptIn: order.marketingOptIn,
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
