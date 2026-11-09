import "server-only";
import { prisma } from "@/db/client";
import { EmailError, sendEmail } from "@/core/networking/external/email-client";
import { flagOrder } from "@/core/modules/payments/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { buildProductionMail } from "./emails";
import { maskEmail } from "./utils";

/*
 * "In productie" for the customer: the moment the team approves the first pose of a Palley op maat (Pose goedkeuren in
 * the backoffice). From then on it's made especially for them, so it can't be cancelled free of charge any more
 * (core/modules/returns/utils.ts), and the return policy promises a mail. Each order gets it once, however many Palleys
 * op maat it has or how often a model is generated again. This is not OrderStatus.IN_PRODUCTION, which follows the batch.
 */

/** Marks every paid order with this preview as in production and mails the customer, once per order. */
export async function startProductionForPreview(previewId: string, adminName: string) {
  const orders = await prisma.order.findMany({
    where: { status: "PAID", productionStartedAt: null, items: { some: { previewId } } },
    select: { id: true },
  });
  for (const { id } of orders) await startProductionOnce(id, adminName);
}

async function startProductionOnce(orderId: string, adminName: string) {
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, status: "PAID", productionStartedAt: null },
    data: { productionStartedAt: new Date() },
  });
  if (claimed.count === 0) return;

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { number: true, firstName: true, email: true, locale: true, status: true, confirmationSentAt: true },
  });
  // Without a confirmation mail (an order an admin added without one) the customer doesn't expect this one either.
  const mail = order.email && order.confirmationSentAt;
  await prisma.orderStatusChange.create({
    data: {
      orderId,
      fromStatus: order.status,
      toStatus: order.status,
      source: `admin:${adminName}`,
      note: `In productie: pose goedgekeurd${mail ? ", klant gemaild" : ", geen mail (geen bevestigingsmail verstuurd)"}`,
    },
  });
  if (!mail) return;

  try {
    const { company } = await getShopSettings();
    const sent = await sendEmail({ to: order.email!, ...buildProductionMail(order, { company }), idempotencyKey: `order-production-${orderId}` });
    if (!sent) console.warn(`[orders] production mail for ${order.number} not sent: e-mail is not configured`);
  } catch (error) {
    console.error(`[orders] production mail for ${order.number} (${maskEmail(order.email!)}) failed:`, error instanceof Error ? error.message : error);
    const detail = error instanceof EmailError ? error.detail : null;
    await flagOrder(orderId, `Productiemail kon niet verstuurd worden${detail ? ` (Resend: ${detail})` : ""}`);
  }
}
