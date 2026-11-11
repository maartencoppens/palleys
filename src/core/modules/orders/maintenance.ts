import "server-only";
import { prisma } from "@/db/client";
import type { PaymentStatus } from "@/db/generated/enums";
import { deleteObject } from "@/core/networking/external/storage-client";
import { completeBatchIfDone } from "@/core/modules/batches/sync";
import { MANUAL_PAYMENT_PROVIDER } from "@/data/payment-methods";
import { needsShippingAddress } from "@/data/shipping";
import { OrderActionError } from "./admin";
import { OrderNotFoundError } from "./service";
import type { DeleteOrderInput, OrderDetailsInput } from "./types";

/*
 * Fixing orders from the backoffice instead of in the database: correcting an order's details, and removing an order
 * altogether (test orders). Deleting is deliberately awkward: the admin types the order number and a reason, an order
 * paid with real money needs one more confirmation, and what it was stays in DeletedOrder (without customer data).
 */

// A payment that can still turn into money: deleting its order now would leave that money without an order.
const LIVE_PAYMENT_STATUSES: PaymentStatus[] = ["OPEN", "PENDING", "AUTHORIZED"];

/** Real money: paid, more than nothing, not in Stripe's test mode. Cash or a transfer an admin recorded counts. */
const isRealMoney = (payment: { status: PaymentStatus; amountCents: number; mode: string | null }) =>
  payment.status === "PAID" && payment.amountCents > 0 && payment.mode !== "test";

export async function deleteOrder(orderId: string, input: DeleteOrderInput, adminName: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      invoiceNumber: true,
      status: true,
      totalCents: true,
      createdAt: true,
      batchId: true,
      payments: { select: { provider: true, mode: true, status: true, amountCents: true } },
      items: { select: { previewId: true } },
    },
  });
  if (!order) throw new OrderNotFoundError(orderId);
  if (input.confirmNumber !== order.number) throw new OrderActionError("Het ordernummer klopt niet: typ het exact over");
  if (order.payments.some((payment) => payment.provider !== MANUAL_PAYMENT_PROVIDER && LIVE_PAYMENT_STATUSES.includes(payment.status))) {
    throw new OrderActionError("Er loopt nog een betaling via Stripe. Haal eerst de betaalstatus op, of wacht tot ze verlopen is (30 minuten).");
  }
  if (order.payments.some(isRealMoney) && !input.confirmPaid) {
    throw new OrderActionError("Deze order is met echt geld betaald: bevestig dat het terugbetaald is of een test was");
  }

  // The order's own previews go with it; one that another order also points at (bought twice) stays.
  const previewIds = order.items.flatMap((item) => item.previewId ?? []);
  const previews = await prisma.preview.findMany({
    where: { id: { in: previewIds }, forCollectible: false, orderItems: { every: { orderId } } },
    select: { id: true, poseImageKey: true, glbKey: true, objKey: true, mtlKey: true, textureKey: true, processedKey: true, photos: { select: { key: true } }, poseCandidates: { select: { key: true } } },
  });

  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId } }),
    prisma.payment.deleteMany({ where: { orderId } }),
    prisma.shipment.deleteMany({ where: { orderId } }),
    prisma.orderStatusChange.deleteMany({ where: { orderId } }),
    prisma.order.delete({ where: { id: orderId } }),
    prisma.preview.deleteMany({ where: { id: { in: previews.map((preview) => preview.id) } } }),
    prisma.deletedOrder.create({
      data: {
        orderId,
        number: order.number,
        invoiceNumber: order.invoiceNumber,
        status: order.status,
        totalCents: order.totalCents,
        paymentSummary:
          order.payments.map((payment) => [payment.provider, payment.mode, payment.status, payment.amountCents].filter(Boolean).join(" ")).join("; ") ||
          "geen",
        orderCreatedAt: order.createdAt,
        reason: input.reason,
        deletedBy: adminName,
      },
    }),
  ]);

  // Photos, poses and models in R2: best effort, the rows are gone either way.
  const keys = previews.flatMap((preview) =>
    [preview.poseImageKey, preview.glbKey, preview.objKey, preview.mtlKey, preview.textureKey, preview.processedKey, ...preview.photos.map((photo) => photo.key), ...preview.poseCandidates.map((candidate) => candidate.key)].filter(
      (key): key is string => Boolean(key),
    ),
  );
  await Promise.all(
    keys.map((key) => deleteObject(key).catch((error) => console.error(`[orders] could not delete ${key}:`, error instanceof Error ? error.message : error))),
  );
  // Its batch may be finished now that this order is out of it.
  if (order.batchId) await completeBatchIfDone(order.batchId);

  console.info(`[orders] ${order.number} deleted by ${adminName}: ${input.reason}`);
  return { orderId, number: order.number, previews: previews.length };
}

const FIELD_LABELS = {
  firstName: "voornaam",
  lastName: "achternaam",
  email: "e-mail",
  phone: "telefoon",
  street: "straat",
  houseNumber: "huisnummer",
  postalCode: "postcode",
  city: "gemeente",
  trackingCode: "trackingcode",
} as const;

/**
 * Corrects an order's details. The log says which fields changed, never their values (those are personal data).
 * The address only exists for a parcel, and stays as it was once the parcel left.
 */
export async function updateOrderDetails(orderId: string, input: OrderDetailsInput, adminName: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      street: true,
      houseNumber: true,
      postalCode: true,
      city: true,
      shipment: { select: { deliveryType: true, trackingCode: true } },
      items: { select: { id: true, notes: true } },
    },
  });
  if (!order) throw new OrderNotFoundError(orderId);

  const parcel = needsShippingAddress(order.shipment?.deliveryType);
  if (input.address && !parcel) throw new OrderActionError("Deze order wordt niet verzonden: er hoort geen adres bij");
  if (!input.address && parcel) throw new OrderActionError("Een verzending heeft een volledig adres nodig");
  const unknownItem = Object.keys(input.itemNotes).find((itemId) => !order.items.some((item) => item.id === itemId));
  if (unknownItem) throw new OrderActionError("Een van de lijnen hoort niet bij deze order");

  const next = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    ...(input.address ?? { street: null, houseNumber: null, postalCode: null, city: null }),
  };
  const changed = (Object.keys(next) as (keyof typeof next)[]).filter((field) => (order[field] ?? null) !== (next[field] ?? null));
  const addressFields = ["street", "houseNumber", "postalCode", "city"];
  if (order.status === "SHIPPED" && changed.some((field) => addressFields.includes(field))) {
    throw new OrderActionError("Deze order is al verzonden: het adres kan niet meer veranderen");
  }
  const trackingChanged = order.shipment !== null && (order.shipment.trackingCode ?? null) !== input.trackingCode;
  const notesChanged = order.items.filter((item) => item.id in input.itemNotes && (item.notes ?? null) !== input.itemNotes[item.id]);

  const labels = [
    ...changed.map((field) => FIELD_LABELS[field]),
    ...(trackingChanged ? [FIELD_LABELS.trackingCode] : []),
    ...(notesChanged.length > 0 ? ["opmerking bij een lijn"] : []),
  ];
  if (labels.length === 0) return { orderId, changed: [] };

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: Object.fromEntries(changed.map((field) => [field, next[field]])) }),
    ...(trackingChanged ? [prisma.shipment.update({ where: { orderId }, data: { trackingCode: input.trackingCode } })] : []),
    ...notesChanged.map((item) => prisma.orderItem.update({ where: { id: item.id }, data: { notes: input.itemNotes[item.id] } })),
    prisma.orderStatusChange.create({
      data: { orderId, fromStatus: order.status, toStatus: order.status, source: `admin:${adminName}`, note: `Gegevens aangepast: ${labels.join(", ")}` },
    }),
  ]);
  return { orderId, changed: labels };
}
