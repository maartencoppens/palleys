// Shipping config. No server-only imports: the checkout form uses the country list too.

// The shipping policy page; LEGAL-REVIEW: its texts are in core/locale/messages (legal.shippingPolicy).
export const SHIPPING_POLICY_URL = "/verzendbeleid";
// Delivery options come from a ShippingProvider (core/modules/shipping): the static provider below. Its prices are
// starting values that an admin can change in /admin/settings.
import type { KeychainSize } from "./sizes";

// Countries we can ship to: where customers can pay us (Bancontact in Belgium; Wero in Germany, France, Luxembourg and
// the Netherlands; payment methods: data/payment-methods.ts). Which ones are open is up to the delivery options an admin
// switched on under Verzending: a country without one isn't offered in the checkout.
export const SHIPPING_COUNTRIES = [
  { code: "BE", payment: "Bancontact" },
  { code: "NL", payment: "Wero" },
  { code: "DE", payment: "Wero" },
  { code: "FR", payment: "Wero" },
  { code: "LU", payment: "Wero" },
] as const;
export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number]["code"];
export const SHIPPING_COUNTRY_CODES = SHIPPING_COUNTRIES.map((c) => c.code) as [ShippingCountry, ...ShippingCountry[]];
export const isShippingCountry = (code: string): code is ShippingCountry => (SHIPPING_COUNTRY_CODES as string[]).includes(code);

// Postal code formats, checked server-side (Zod) and in the browser.
export const POSTAL_CODE_PATTERNS: Record<ShippingCountry, RegExp> = {
  BE: /^[1-9]\d{3}$/,
  NL: /^[1-9]\d{3} ?[A-Za-z]{2}$/,
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
  LU: /^(L-?)?\d{4}$/i,
};

// What the postal code field shows and lets the phone keyboard type, per country.
export const POSTAL_CODE_HINTS: Record<ShippingCountry, { placeholder: string; numeric: boolean }> = {
  BE: { placeholder: "9000", numeric: true },
  NL: { placeholder: "1234 AB", numeric: false },
  DE: { placeholder: "10115", numeric: true },
  FR: { placeholder: "75001", numeric: true },
  LU: { placeholder: "1009", numeric: false },
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
  /** Offered before an admin saved anything for it. Off for a new country until its price is checked. */
  defaultEnabled?: boolean;
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
    // PostNL, labels made by hand. The bpost CSV export (Productie) stays for if we ever ship with bpost again.
    id: "be-postnl-home",
    country: "BE",
    carrier: "PostNL",
    deliveryType: "HOME",
    label: "Thuislevering met PostNL",
    eta: "1–2 werkdagen na verzending",
    defaultPriceCents: 610,
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
  // Abroad: PostNL from Belgium. Off until an admin checks the price and switches the country on (Verzending).
  ...(["NL", "DE", "FR", "LU"] as const).map(
    (country): StaticDeliveryOption => ({
      id: `${country.toLowerCase()}-postnl-home`,
      country,
      carrier: "PostNL",
      deliveryType: "HOME",
      label: "Thuislevering met PostNL",
      eta: "2–5 werkdagen na verzending",
      defaultPriceCents: country === "NL" ? 895 : 1195,
      defaultEnabled: false,
    }),
  ),
];

/** Whether an option is offered: the admin's switch, or its starting value. */
export const isOptionEnabled = (option: StaticDeliveryOption, override?: { enabled: boolean }) =>
  override?.enabled ?? option.defaultEnabled ?? true;

// Highest shipping price an admin can enter, as a guard against typos (€ 50,00).
export const MAX_SHIPPING_PRICE_CENTS = 5000;
