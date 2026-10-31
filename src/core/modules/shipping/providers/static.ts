import "server-only";
import { getShopSettings } from "@/core/modules/settings/service";
import { STATIC_DELIVERY_OPTIONS } from "@/data/shipping";
import type { ShippingProvider } from "./types";

// Fixed options from src/data/shipping.ts, with the price and on/off switch an admin set in /admin/settings.
export const staticShippingProvider: ShippingProvider = {
  name: "static",
  async getDeliveryOptions({ address }) {
    const { shippingOverrides } = await getShopSettings();
    return STATIC_DELIVERY_OPTIONS.filter((option) => option.country === address.country)
      .map((option) => {
        const override = shippingOverrides[option.id];
        return { option, enabled: override?.enabled ?? true, priceCents: override?.priceCents ?? option.defaultPriceCents };
      })
      .filter(({ enabled }) => enabled)
      .map(({ option, priceCents }) => ({
        id: option.id,
        provider: "static",
        carrier: option.carrier,
        deliveryType: option.deliveryType,
        label: option.label,
        eta: option.eta,
        priceCents,
        checkoutIdentifier: null,
      }));
  },
};
