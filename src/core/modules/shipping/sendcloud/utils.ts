/*
 * Sendcloud's status messages, sorted into "the carrier doesn't have it yet" and everything after. The numeric ids
 * aren't documented as stable, the messages are what the panel shows (e.g. "Ready to send", "En route to sorting
 * center", "Delivered"). Anything not listed as before-handover counts as shipped.
 */
const NOT_HANDED_OVER = [
  /^announced/i,
  /^ready to send/i,
  /^no label/i,
  /^announcement failed/i,
  /^error collecting/i,
  /^address invalid/i,
  /^unknown status/i,
  /cancel/i,
];

/** True once the carrier has the parcel: from then on the order is shipped. */
export function isHandedOver(statusMessage: string) {
  return !NOT_HANDED_OVER.some((pattern) => pattern.test(statusMessage.trim()));
}

/** Our order number as Sendcloud carries it: in `order_number`, or the external id of an integration. */
export function orderNumberOf(parcel: { order_number?: string | null; external_order_id?: string | null }) {
  const pattern = /^PAL-\d{4}-\d{5}$/;
  return [parcel.order_number, parcel.external_order_id].map((value) => value?.trim()).find((value) => value && pattern.test(value)) ?? null;
}
