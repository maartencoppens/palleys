// How customers pay. Bancontact Pro (contract via KBC) on its hosted checkout page: a QR code on desktop, straight
// to the Bancontact or bank app on a phone. Belgian customers only; other countries need another provider (phase 8).
export const PAYMENT_METHODS = ["bancontact"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bancontact: "Bancontact",
};
