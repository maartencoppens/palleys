import "server-only";
import { prisma } from "@/db/client";
import type { OrderStatus } from "@/db/generated/enums";
import { batchRef } from "@/core/utils/naming";
import { shouldComplete } from "./status";

/*
 * Keeps a batch right when one of its orders moves (called from payments/service.ts moveOrder, for every source).
 * Only reads and writes rows: it never moves an order itself, so it can't loop back.
 */

// What can't stay in a batch that hasn't gone to JLC yet.
const LEAVES_OPEN_BATCH: OrderStatus[] = ["REFUNDED", "CANCELLED", "EXPIRED"];

export async function syncBatchAfterOrderMove(orderId: string, to: OrderStatus) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { attentionReason: true, batch: { select: { id: true, number: true, status: true } } },
  });
  if (!order?.batch) return;

  if (LEAVES_OPEN_BATCH.includes(to) && order.batch.status === "OPEN") {
    const note = `Uit ${batchRef(order.batch.number)} gehaald: order ${to === "REFUNDED" ? "terugbetaald" : "gesloten"}`;
    await prisma.order.update({
      where: { id: orderId },
      data: { batchId: null, attentionReason: order.attentionReason ? `${order.attentionReason} | ${note}` : note },
    });
    return;
  }
  await completeBatchIfDone(order.batch.id);
}

/** COMPLETED as soon as every order in post-production is finished. Safe to call any time. */
export async function completeBatchIfDone(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { status: true, orders: { select: { status: true } } },
  });
  if (!batch || !shouldComplete(batch.status, batch.orders.map((order) => order.status))) return false;
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.batch.updateMany({
      where: { id: batchId, status: "IN_POST_PRODUCTION" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (count === 0) return false;
    await tx.batchStatusChange.create({
      data: { batchId, fromStatus: "IN_POST_PRODUCTION", toStatus: "COMPLETED", source: "system", note: "Alle orders afgerond" },
    });
    return true;
  });
}
