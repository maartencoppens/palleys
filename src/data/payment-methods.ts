// How customers pay. Bancontact Pro (contract via KBC) on its hosted checkout page: a QR code on desktop, straight
// to the Bancontact or bank app on a phone. Belgian customers only; other countries need another provider (phase 8).
export const PAYMENT_METHODS = ["bancontact"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Money that reached us outside the checkout, recorded by an admin on a manually added order.
export const MANUAL_PAYMENT_PROVIDER = "manual";
export const MANUAL_PAYMENT_METHODS = ["cash", "transfer", "gift", "other"] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];
// A stock order has nothing to pay; this marks it as settled so it can go into production.
export const STOCK_PAYMENT_METHOD = "stock";

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bancontact: "Bancontact",
  cash: "Contant",
  transfer: "Overschrijving",
  gift: "Geschenk (geen betaling)",
  other: "Anders",
  discount: "Gratis met kortingscode",
  stock: "Voorraadorder (geen betaling)",
};
