// Shipping config. No server-only imports: the checkout form uses the country list too.
// Delivery options come from a ShippingProvider (core/modules/shipping). Until Sendcloud is connected that is the
// static provider below; its prices are starting values that an admin can change in /admin/settings.
import type { KeychainSize } from "./sizes";

// Countries we ship to: Belgium only, where customers pay with Bancontact (data/payment-methods.ts).
export const SHIPPING_COUNTRIES = [{ code: "BE", label: "België" }] as const;
export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number]["code"];
export const SHIPPING_COUNTRY_CODES = SHIPPING_COUNTRIES.map((c) => c.code) as [ShippingCountry, ...ShippingCountry[]];

// Postal code formats, checked server-side (Zod) and in the browser.
export const POSTAL_CODE_PATTERNS: Record<ShippingCountry, RegExp> = {
  BE: /^[1-9]\d{3}$/,
};

// Weight and box per Palley size, for carrier rates and labels later. Starting values: weigh a real parcel.
export const PARCEL_BY_SIZE: Record<KeychainSize, { weightGrams: number }> = {
  M: { weightGrams: 25 },
};
export const PACKAGING = { weightGrams: 40, dimensionsCm: { length: 16, width: 11, height: 3 } };

export type DeliveryType = "HOME" | "SERVICE_POINT";

// Only for orders an admin adds: no parcel, we hand it over ourselves.
export const HANDOVER_DELIVERY = {
  id: "handover",
  provider: "manual",
  carrier: "Palleys",
  deliveryType: "HANDOVER",
  label: "Zelf overhandigen",
} as const;

export type StaticDeliveryOption = {
  id: string;
  country: ShippingCountry;
  carrier: string;
  deliveryType: DeliveryType;
  label: string;
  eta: string;
  defaultPriceCents: number; // VAT included; overridable in /admin/settings
};

// Used while no carrier API is connected, and as fallback when it fails, so checkout never blocks.
export const STATIC_DELIVERY_OPTIONS: StaticDeliveryOption[] = [
  {
    id: "be-bpost-home",
    country: "BE",
    carrier: "bpost",
    deliveryType: "HOME",
    label: "Thuislevering met bpost",
    eta: "1–2 werkdagen na verzending",
    defaultPriceCents: 495,
  },
];

// Highest shipping price an admin can enter, as a guard against typos (€ 50,00).
export const MAX_SHIPPING_PRICE_CENTS = 5000;
