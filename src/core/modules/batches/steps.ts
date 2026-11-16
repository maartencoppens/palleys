import type { BatchStatus, OrderStatus } from "@/db/generated/enums";
import { OPEN_ORDER_STATUSES } from "@/core/modules/orders/check-in";

/*
 * The later steps an admin can send a whole order to by hand ("Status handmatig aanpassen"): the backoffice pages after
 * Processed, in order. Forward only: going back is done where it normally is (Batches: out of the batch). Pure, so the
 * panel and the server agree on what's possible.
 */

export const ORDER_STEPS = ["BATCH", "AT_JLC", "POST_PRODUCTION", "FINISHED"] as const;
export type OrderStep = (typeof ORDER_STEPS)[number];

export const ORDER_STEP_LABELS: Record<OrderStep, string> = {
  BATCH: "In een batch, nog niet naar JLC",
  AT_JLC: "Verzonden naar JLC",
  POST_PRODUCTION: "In postproductie",
  FINISHED: "Verzonden, opgehaald of overhandigd",
};

/** The backoffice page each step is on, to group them by. */
export const ORDER_STEP_PAGES: Record<OrderStep, string> = {
  BATCH: "Batches",
  AT_JLC: "Productie",
  POST_PRODUCTION: "Productie",
  FINISHED: "Afgerond",
};

/** Where an order is now; null = in no batch yet (still in the pipeline, or waiting for a batch). */
export function currentOrderStep(status: OrderStatus, batchStatus: BatchStatus | null): OrderStep | null {
  if (status === "SHIPPED") return "FINISHED";
  if (batchStatus === "OPEN") return "BATCH";
  if (batchStatus === "SENT_TO_JLC") return "AT_JLC";
  if (batchStatus === "IN_POST_PRODUCTION" || batchStatus === "COMPLETED") return "POST_PRODUCTION";
  return null;
}

/**
 * The steps this order can be sent to: only later ones, and only while it is paid and not finished. An order that went
 * into production by hand without a batch ("Start productie") can't go into an open batch any more: that one would
 * refuse it when it goes to JLC.
 */
export function reachableOrderSteps(status: OrderStatus, batchStatus: BatchStatus | null): OrderStep[] {
  if (!OPEN_ORDER_STATUSES.includes(status)) return [];
  const current = currentOrderStep(status, batchStatus);
  const from = current ? ORDER_STEPS.indexOf(current) : -1;
  return ORDER_STEPS.filter((step, index) => index > from && !(step === "BATCH" && status === "IN_PRODUCTION"));
}
