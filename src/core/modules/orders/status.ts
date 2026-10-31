import type { OrderStatus } from "@/db/generated/enums";

/*
 * Allowed order transitions (same pattern as previews/status.ts). Re-processing the same status is never a
 * transition, which is what makes the webhook idempotent. CANCELLED/EXPIRED → PAID exists on purpose: money that
 * the payment provider reports as received is always recorded, even when we had already closed the order.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED", "EXPIRED"],
  PAID: ["IN_PRODUCTION", "SHIPPED", "REFUNDED"],
  IN_PRODUCTION: ["SHIPPED", "REFUNDED"],
  SHIPPED: ["REFUNDED"],
  CANCELLED: ["PAID"],
  EXPIRED: ["PAID"],
  REFUNDED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return TRANSITIONS[from].includes(to);
}

export class InvalidOrderTransitionError extends Error {
  constructor(
    public readonly from: OrderStatus,
    public readonly to: OrderStatus,
  ) {
    super(`Invalid order transition: ${from} -> ${to}`);
  }
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus) {
  if (!canTransitionOrder(from, to)) throw new InvalidOrderTransitionError(from, to);
}

export function orderStatusesThatCanTransitionTo(to: OrderStatus) {
  return (Object.keys(TRANSITIONS) as OrderStatus[]).filter((from) => canTransitionOrder(from, to));
}

// Statuses in which the customer has paid and we owe them a Palley (or a refund).
export const PAID_ORDER_STATUSES: OrderStatus[] = ["PAID", "IN_PRODUCTION", "SHIPPED"];
