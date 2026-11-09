import type { OrderStatus, ReturnStatus } from "@/db/generated/enums";

/*
 * Allowed transitions of a return request (same pattern as orders/status.ts), the only source of truth for them.
 *   SUBMITTED → APPROVED → COMPLETED (refunded or reprinted and sent)
 *   SUBMITTED → REJECTED (with a reason the customer gets)
 */
const TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  SUBMITTED: ["APPROVED", "REJECTED"],
  APPROVED: ["COMPLETED"],
  REJECTED: [],
  COMPLETED: [],
};

export function canTransitionReturn(from: ReturnStatus, to: ReturnStatus) {
  return TRANSITIONS[from].includes(to);
}

export class InvalidReturnTransitionError extends Error {
  constructor(
    public readonly from: ReturnStatus,
    public readonly to: ReturnStatus,
  ) {
    super(`Invalid return transition: ${from} -> ${to}`);
  }
}

export function assertReturnTransition(from: ReturnStatus, to: ReturnStatus) {
  if (!canTransitionReturn(from, to)) throw new InvalidReturnTransitionError(from, to);
}

/** Still being handled: the items in it can't be asked for again, and the order keeps its attention flag. */
export const OPEN_RETURN_STATUSES: ReturnStatus[] = ["SUBMITTED", "APPROVED"];

export const isReturnOpen = (status: ReturnStatus) => OPEN_RETURN_STATUSES.includes(status);

// LEGAL-REVIEW: only paid orders get a link from /retour; an unpaid, expired or cancelled one has nothing to return.
export const RETURN_ACCESS_ORDER_STATUSES: OrderStatus[] = ["PAID", "IN_PRODUCTION", "SHIPPED", "REFUNDED"];
