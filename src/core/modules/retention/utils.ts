import type { OrderStatus } from "@/db/generated/enums";
import { PHOTO_RETENTION_DAYS, PRINT_MODEL_RETENTION_YEARS } from "@/data/retention";
import { addDays, addYears, brusselsDay, receivedOn, type CalendarDay, type ReturnShipment } from "@/core/modules/returns/utils";

/*
 * When a paid preview's files may go, from the privacy policy (art. 6). Pure: the service reads the database, this
 * decides. A preview can be on more than one paid order (a reprint after a warranty claim): its files stay until the
 * last of them is done with.
 */

export type RetentionOrder = {
  status: OrderStatus;
  photoMarketingConsent: boolean;
  shipment: ReturnShipment;
  /** When it went to REFUNDED, from the order's status log. */
  refundedAt: Date | null;
};

/** The day an order was done with: received (delivered, picked up, handed over) or refunded. Null while it isn't. */
export function finishedOn(order: RetentionOrder): CalendarDay | null {
  if (order.status === "SHIPPED") return receivedOn(order.shipment)?.day ?? null;
  if (order.status === "REFUNDED") return order.refundedAt ? brusselsDay(order.refundedAt) : null;
  return null;
}

/** The last day any of the orders was done with; null while one of them still runs, or when there are none. */
function lastFinished(orders: RetentionOrder[]) {
  const days = orders.map(finishedOn);
  if (days.length === 0 || days.some((day) => day === null)) return null;
  return (days as CalendarDay[]).sort().at(-1)!;
}

/** Photos, pose and in-between models: 6 weeks after the last order was done, unless the customer allowed marketing. */
export function photosAreDue(orders: RetentionOrder[], today: CalendarDay) {
  if (orders.some((order) => order.photoMarketingConsent)) return false;
  const last = lastFinished(orders);
  return last !== null && today > addDays(last, PHOTO_RETENTION_DAYS);
}

/** The print-ready model: 2 years after the last delivery, when the guarantee has run out. */
export function printModelIsDue(orders: RetentionOrder[], today: CalendarDay) {
  const last = lastFinished(orders);
  return last !== null && today > addYears(last, PRINT_MODEL_RETENTION_YEARS);
}
