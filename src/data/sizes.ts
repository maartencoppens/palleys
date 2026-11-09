// Maten van de sleutelhanger: de enige bron, voor Meshy's resize en voor de maat die de site toont.
// Lengte van de langste zijde in meter, zoals Meshy's resize verwacht.
export const KEYCHAIN_SIZES = {
  M: { longestSideMeters: 0.037 }, // 3,7 cm
} as const;

export type KeychainSize = keyof typeof KEYCHAIN_SIZES;

// De maat die een klant krijgt (er is er maar één). LEGAL-REVIEW: dezelfde maat als in art. 2.3 van de voorwaarden.
export const SHOWN_KEYCHAIN_SIZE: KeychainSize = "M";
