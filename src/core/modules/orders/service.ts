import "server-only";
import { z } from "zod";
import { prisma } from "@/db/client";
import type { Prisma } from "@/db/generated/client";
import { createDownloadUrl } from "@/core/networking/external/storage-client";
import { tokenMatches } from "@/core/utils/tokens";
import { collectibleImageUrl } from "@/core/modules/collectibles/utils";
import { nextStepLabel, OPEN_ORDER_STATUSES, summarizeCheckIn } from "./check-in";
import { PAID_ORDER_STATUSES } from "./status";
import { formatOrderNumber, orderYear } from "./utils";
import type { AdminOrderDetail, AdminOrderListItem, AdminOrderStats, OrderCheckInRow, OrderListQuery } from "./types";
import type { OrderStatusView } from "@/core/modules/checkout/types";

const ORDER_LIST_LIMIT = 100;

export class OrderNotFoundError extends Error {}

/** Next number for the current year. Call inside the order's transaction. */
export async function nextOrderNumber(tx: Pick<typeof prisma, "$queryRaw">) {
  const year = orderYear();
  // Row-locking upsert inside the order's transaction: concurrent checkouts wait, a rollback leaves no gap.
  const [row] = await tx.$queryRaw<{ last: number }[]>`
    INSERT INTO "OrderCounter" ("year", "last") VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE SET "last" = "OrderCounter"."last" + 1
    RETURNING "last"`;
  return formatOrderNumber(year, row.last);
}

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
      items: { select: { checkedInAt: true, preview: { select: { status: true } } } },
    },
  });
  return orders.map((order) => {
    const summary = summarizeCheckIn(
      order.items.map((item) => ({ previewStatus: item.preview?.status ?? null, checkedInAt: item.checkedInAt })),
    );
    const handover = order.shipment?.deliveryType === "HANDOVER";
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      name: `${order.firstName} ${order.lastName}`,
      createdBy: order.createdBy,
      paidAt: order.paidAt?.toISOString() ?? null,
      handover,
      summary,
      nextStep: nextStepLabel(order.status, summary, { handover }),
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
        include: {
          preview: {
            select: {
              status: true,
              // The first photo, whoever uploaded it: on a manually added order that's the admin.
              photos: { orderBy: { createdAt: "asc" }, take: 1, select: { key: true } },
            },
          },
          collectible: { select: { imageKey: true } },
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
      const key = item.preview?.photos[0]?.key;
      return {
        id: item.id,
        kind: item.previewId ? ("personalized" as const) : ("collectible" as const),
        previewId: item.previewId,
        previewStatus: item.preview?.status ?? null,
        collectibleId: item.collectibleId,
        checkedInAt: item.checkedInAt?.toISOString() ?? null,
        checkedInBy: item.checkedInBy,
        title: item.title,
        sku: item.sku,
        size: item.size,
        quantity: item.quantity,
        unitCents: item.unitCents,
        notes: item.notes,
        photoUrl: key ? await createDownloadUrl(key) : collectibleImageUrl(item.collectible?.imageKey ?? null),
      };
    }),
  );

  return {
    id: order.id,
    number: order.number,
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
    shippingCents: order.shippingCents,
    vatCents: order.vatCents,
    totalCents: order.totalCents,
    termsVersion: order.termsVersion,
    termsAcceptedAt: order.termsAcceptedAt?.toISOString() ?? null,
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
