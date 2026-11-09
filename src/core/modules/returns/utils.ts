import type { OrderStatus, ReturnStatus, ReturnType } from "@/db/generated/enums";
import { isPersonalDelivery } from "@/data/shipping";
import { ESTIMATED_DELIVERY_WORKING_DAYS, WARRANTY_YEARS, WITHDRAWAL_DAYS } from "@/data/returns";
import { isReturnOpen } from "./status";
import type { ReturnItemStatus } from "./types";

/*
 * What a customer may ask for, per item, from the return policy. Pure: the overview page, the service that checks a
 * request and the tests all use these. Dates are calendar days in Belgium ("2026-11-09"), so a deadline ends at
 * midnight Brussels time whatever the server's time zone, and summer time can't move it.
 */

export type CalendarDay = string; // YYYY-MM-DD

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Brussels",
});

export const brusselsDay = (date: Date): CalendarDay => dayFormatter.format(date);

const toUtc = (day: CalendarDay) => new Date(`${day}T00:00:00Z`);
const fromUtc = (date: Date): CalendarDay => date.toISOString().slice(0, 10);

export function addDays(day: CalendarDay, days: number): CalendarDay {
  const date = toUtc(day);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

export function addYears(day: CalendarDay, years: number): CalendarDay {
  const date = toUtc(day);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return fromUtc(date);
}

/** Skips Saturdays and Sundays. */
export function addWorkingDays(day: CalendarDay, days: number): CalendarDay {
  let current = day;
  let left = days;
  while (left > 0) {
    current = addDays(current, 1);
    const weekday = toUtc(current).getUTCDay();
    if (weekday !== 0 && weekday !== 6) left--;
  }
  return current;
}

export type ReturnShipment = { deliveryType: string; shippedAt: Date | null; deliveredAt: Date | null } | null;

export type ReceivedOn = { day: CalendarDay; estimated: boolean };

/**
 * When the customer got their Palleys: the date the team filled in, the moment of pickup or handover, or for a parcel
 * the day it was posted plus a few working days. Null when the order never left (or left before we kept the date).
 */
export function receivedOn(shipment: ReturnShipment): ReceivedOn | null {
  if (shipment?.deliveredAt) return { day: brusselsDay(shipment.deliveredAt), estimated: false };
  if (!shipment?.shippedAt) return null;
  const shipped = brusselsDay(shipment.shippedAt);
  if (isPersonalDelivery(shipment.deliveryType)) return { day: shipped, estimated: false };
  return { day: addWorkingDays(shipped, ESTIMATED_DELIVERY_WORKING_DAYS), estimated: true };
}

// LEGAL-REVIEW: "tot 14 dagen nadat je ze ontvangen of opgehaald hebt": the 14th day after receipt is the last one.
export const withdrawalDeadline = (received: CalendarDay) => addDays(received, WITHDRAWAL_DAYS);
export const warrantyDeadline = (received: CalendarDay) => addYears(received, WARRANTY_YEARS);

export type ReturnRequestLine = { type: ReturnType; status: ReturnStatus; quantity: number };

export type ReturnRulesItem = {
  /** A collectible; false for a Palley op maat (art. VI.53, 3° WER). */
  withdrawable: boolean;
  quantity: number;
  /** The lines of earlier requests on this item, in every status. */
  requests: ReturnRequestLine[];
};

export type ReturnRulesOrder = {
  status: OrderStatus;
  /** A pose was approved (Order.productionStartedAt): for the customer the order is in production, before any batch. */
  productionStarted: boolean;
  /** A reprint after a warranty claim: a replacement, so only the guarantee applies to it. */
  isReprint: boolean;
  shipment: ReturnShipment;
};

/** Why an action isn't offered, so the page can explain it. */
export type ReturnNotice =
  | "custom_no_withdrawal" // op maat and in production or later: no right of withdrawal
  | "withdrawal_expired"
  | "warranty_expired"
  | "refunded"
  | "request_open"; // everything of this item is already in a request being handled

export type ItemReturnOptions = {
  /** How many copies can still be asked for, per kind of request; 0 = not offered. */
  cancel: number;
  withdraw: number;
  warranty: number;
  /** Withdrawal before the Palleys left: full refund, nothing to send back. After: return them within 14 days. */
  withdrawalReceived: boolean;
  withdrawalDeadline: CalendarDay | null;
  notices: ReturnNotice[];
};

// Cancelled or withdrawn copies are gone for good, unless the team rejected the request.
const isGone = (line: ReturnRequestLine) => (line.type === "CANCELLATION" || line.type === "WITHDRAWAL") && line.status !== "REJECTED";
const isOpenWarranty = (line: ReturnRequestLine) => line.type === "WARRANTY" && isReturnOpen(line.status);
const sum = (lines: ReturnRequestLine[]) => lines.reduce((total, line) => total + line.quantity, 0);

const NOT_SENT: OrderStatus[] = ["PAID", "IN_PRODUCTION"];

export function itemReturnOptions(order: ReturnRulesOrder, item: ReturnRulesItem, today: CalendarDay): ItemReturnOptions {
  const options: ItemReturnOptions = { cancel: 0, withdraw: 0, warranty: 0, withdrawalReceived: false, withdrawalDeadline: null, notices: [] };
  if (order.status === "REFUNDED") return { ...options, notices: ["refunded"] };

  const kept = item.quantity - sum(item.requests.filter(isGone));
  const sent = order.status === "SHIPPED";
  const received = sent ? receivedOn(order.shipment) : null;

  if (!item.withdrawable) {
    // LEGAL-REVIEW: op maat, cancelling is free until the order goes into production: the first approved pose (with a
    // mail to the customer), or at the latest the batch to JLC. After that there's no way back.
    if (order.status === "PAID" && !order.productionStarted && !order.isReprint) options.cancel = kept;
    else options.notices.push("custom_no_withdrawal");
  } else if (!order.isReprint) {
    if (NOT_SENT.includes(order.status)) {
      options.withdraw = kept;
    } else if (sent) {
      // An unknown receipt date (an old order) never shortens the customer's right: the period counts as open.
      const deadline = received ? withdrawalDeadline(received.day) : null;
      if (!deadline || today <= deadline) {
        options.withdraw = kept;
        options.withdrawalReceived = true;
        options.withdrawalDeadline = deadline;
      } else {
        options.notices.push("withdrawal_expired");
      }
    }
  }

  if (sent) {
    if (!received || today <= warrantyDeadline(received.day)) {
      options.warranty = Math.max(0, kept - sum(item.requests.filter(isOpenWarranty)));
    } else {
      options.notices.push("warranty_expired");
    }
  }

  const offered = options.cancel + options.withdraw + options.warranty;
  if (offered === 0 && item.requests.some((line) => isReturnOpen(line.status))) options.notices.push("request_open");
  return options;
}

/** How many copies of an item a request of this type may still include. */
export function allowedQuantity(options: ItemReturnOptions, type: ReturnType) {
  if (type === "CANCELLATION") return options.cancel;
  if (type === "WITHDRAWAL") return options.withdraw;
  return options.warranty;
}

/**
 * A withdrawal is "received" as soon as one of its items was: then the customer sends them back. The order leaves as a
 * whole, so in practice all items of a withdrawal are on the same side.
 */
export const withdrawalNeedsReturn = (options: ItemReturnOptions[]) => options.some((option) => option.withdrawalReceived);

/** The copies of an item that are no longer made: cancelled, or withdrawn before they left. */
export function cancelsProduction(type: ReturnType, itemsReceived: boolean) {
  return type === "CANCELLATION" || (type === "WITHDRAWAL" && !itemsReceived);
}

/** How an item stands for the customer: a running request first, then what happened to it, then the order's status. */
export function itemReturnStatus(
  order: { status: OrderStatus; productionStarted: boolean; shipment: ReturnShipment },
  item: { quantity: number; cancelledQuantity: number; requests: ReturnRequestLine[] },
): ReturnItemStatus {
  if (item.requests.some((line) => isReturnOpen(line.status))) return "request_open";
  if (item.cancelledQuantity >= item.quantity) return "cancelled";
  if (order.status === "REFUNDED") return "refunded";
  if (order.status === "SHIPPED") return isPersonalDelivery(order.shipment?.deliveryType) ? "picked_up" : "sent";
  return order.status === "IN_PRODUCTION" || order.productionStarted ? "in_production" : "paid";
}

/** The attention note a request puts on its order, and takes off again once it's handled. */
export const attentionNote = (requestId: string, typeLabel: string) => `Retouraanvraag ${requestId.slice(0, 8)}: ${typeLabel}`;

/** Takes one note out of an order's attention reason (flagOrder joins them with " | "). Null when nothing is left. */
export function withoutAttentionNote(reason: string | null, note: string) {
  if (!reason) return null;
  const rest = reason.split(" | ").filter((part) => part !== note);
  return rest.length > 0 ? rest.join(" | ") : null;
}

/** An order number as a customer types it: "ply 1042 " → "PLY1042". */
export const normalizeOrderNumber = (value: string) => value.replace(/\s+/g, "").toUpperCase();

/** E-mail addresses compare without case or surrounding spaces. */
export const sameEmail = (a: string | null, b: string) => a !== null && a.trim().toLowerCase() === b.trim().toLowerCase();

/** A key under returns/<orderId>/ is the only kind a request for that order may point at. */
export const isReturnPhotoKeyOf = (prefix: string, orderId: string, key: string) =>
  new RegExp(`^${prefix}/${orderId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(key);
