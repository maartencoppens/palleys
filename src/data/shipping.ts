// Shipping config. No server-only imports: the checkout form uses the country list too.
// Delivery options come from a ShippingProvider (core/modules/shipping): the static provider below. Its prices are
// starting values that an admin can change in /admin/settings.
import type { KeychainSize } from "./sizes";

// Countries we ship to: Belgium only, where customers pay with Bancontact (data/payment-methods.ts).
export const SHIPPING_COUNTRIES = [{ code: "BE" }] as const;
export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number]["code"];
export const SHIPPING_COUNTRY_CODES = SHIPPING_COUNTRIES.map((c) => c.code) as [ShippingCountry, ...ShippingCountry[]];

// Postal code formats, checked server-side (Zod) and in the browser.
export const POSTAL_CODE_PATTERNS: Record<ShippingCountry, RegExp> = {
  BE: /^[1-9]\d{3}$/,
};

// Weight per Palley size and of our box, for the bpost labels. A box holds at most PALLEYS_PER_BOX Palleys; an order
// with more goes in more boxes, on one label. Weighed: a Palley about 15 g, a box at most 30 g.
export const PARCEL_BY_SIZE: Record<KeychainSize, { weightGrams: number }> = {
  M: { weightGrams: 15 },
};
export const PACKAGING = { weightGrams: 30, dimensionsCm: { length: 16, width: 11, height: 3 } };
export const PALLEYS_PER_BOX = 2;

export type DeliveryType = "HOME" | "SERVICE_POINT" | "PICKUP" | "HANDOVER";

// A parcel needs an address. Picking up or getting it from us in person doesn't, so we don't ask for one.
export const needsShippingAddress = (type: string | null | undefined) => type === "HOME" || type === "SERVICE_POINT";
export const isPersonalDelivery = (type: string | null | undefined) => type === "PICKUP" || type === "HANDOVER";

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
  defaultPriceCents: number; // overridable in /admin/settings
};

// For friends and family, free and only offered with a discount code that has personalDelivery on. Never goes to a carrier.
export const FRIENDS_DELIVERY = {
  id: "friends-family",
  provider: "manual",
  carrier: "Palleys",
  deliveryType: "HANDOVER",
  label: "Vrienden en familie: persoonlijk overhandigen",
  eta: "We spreken samen af wanneer we hem geven",
} as const;

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
  {
    id: "be-pickup-kantienberg",
    country: "BE",
    carrier: "Palleys",
    deliveryType: "PICKUP",
    label: "Ophalen op campus Kantienberg",
    eta: "We laten je weten wanneer je bestelling klaarligt",
    defaultPriceCents: 0,
  },
];

// Highest shipping price an admin can enter, as a guard against typos (€ 50,00).
export const MAX_SHIPPING_PRICE_CENTS = 5000;
