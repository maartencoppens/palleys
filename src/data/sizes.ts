// Maten van de sleutelhanger. Later koppelen aan de Shopify-varianten (S/M/L).
// Lengte van de langste zijde in meter, zoals Meshy's resize verwacht.
export const KEYCHAIN_SIZES = {
  M: { longestSideMeters: 0.036 }, // 3,6 cm
} as const;

export type KeychainSize = keyof typeof KEYCHAIN_SIZES;
