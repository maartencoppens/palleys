import type { BatchStatus, OrderStatus } from "@/db/generated/enums";

/*
 * Allowed batch transitions (same pattern as orders/status.ts), the only source of truth for them. A batch only
 * moves forward: once the files are at JLC, nothing about it changes but where its orders are.
 *   OPEN → SENT_TO_JLC → IN_POST_PRODUCTION → COMPLETED
 */
const TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  OPEN: ["SENT_TO_JLC"],
  SENT_TO_JLC: ["IN_POST_PRODUCTION"],
  IN_POST_PRODUCTION: ["COMPLETED"],
  COMPLETED: [],
};

export function canTransitionBatch(from: BatchStatus, to: BatchStatus) {
  return TRANSITIONS[from].includes(to);
}

export class InvalidBatchTransitionError extends Error {
  constructor(
    public readonly from: BatchStatus,
    public readonly to: BatchStatus,
  ) {
    super(`Invalid batch transition: ${from} -> ${to}`);
  }
}

export function assertBatchTransition(from: BatchStatus, to: BatchStatus) {
  if (!canTransitionBatch(from, to)) throw new InvalidBatchTransitionError(from, to);
}

/** Orders can only be added, removed or the batch deleted while it hasn't gone to JLC. */
export const isBatchEditable = (status: BatchStatus) => status === "OPEN";

/** Only a paid order whose Palleys are all print-ready can go into a batch. */
export const BATCHABLE_ORDER_STATUS: OrderStatus = "PAID";

// An order that needs nothing more from us: it left (shipped, picked up, handed over) or was refunded.
export const FINISHED_ORDER_STATUSES: OrderStatus[] = ["SHIPPED", "REFUNDED"];

/** A batch in post-production is done once every order in it is finished. */
export function shouldComplete(status: BatchStatus, orderStatuses: OrderStatus[]) {
  return (
    status === "IN_POST_PRODUCTION" &&
    orderStatuses.length > 0 &&
    orderStatuses.every((orderStatus) => FINISHED_ORDER_STATUSES.includes(orderStatus))
  );
}

/** Check-in happens after the prints come back from JLC; an order outside a batch keeps the old way. */
export const canCheckInInBatch = (status: BatchStatus | null) => status === null || status === "IN_POST_PRODUCTION";
