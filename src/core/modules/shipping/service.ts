import "server-only";
import { parcelFor } from "@/core/modules/catalog/utils";
import { FRIENDS_DELIVERY, SHIPPING_COUNTRY_CODES, type ShippingCountry } from "@/data/shipping";
import type { KeychainSize } from "@/data/sizes";
import { staticShippingProvider } from "./providers/static";
import type { ShippingProvider } from "./providers/types";
import type { DeliveryAddress, DeliveryOption } from "./types";

// The delivery options in use: fixed ones, priced in the settings. Labels are made by hand (PostNL).
const provider: ShippingProvider = staticShippingProvider;

export async function getDeliveryOptions(
  address: DeliveryAddress,
  items: { size: KeychainSize; quantity: number }[],
): Promise<DeliveryOption[]> {
  return provider.getDeliveryOptions({ address, parcel: parcelFor(items), items });
}

/** Whether someone may use this is up to their discount code: see checkout/service.ts. */
export const friendsDelivery = (): DeliveryOption => ({ ...FRIENDS_DELIVERY, priceCents: 0 });

/** Re-checks a chosen option server-side: it must still exist for this address, with our current price. */
export async function resolveDeliveryOption(
  optionId: string,
  address: DeliveryAddress,
  items: { size: KeychainSize; quantity: number }[],
): Promise<DeliveryOption | null> {
  const options = await getDeliveryOptions(address, items);
  return options.find((option) => option.id === optionId) ?? null;
}

/** Every country with the delivery options switched on there (none = not offered), in our order. */
export async function listDeliveryOptionsByCountry(size: KeychainSize = "M") {
  const all = await Promise.all(
    SHIPPING_COUNTRY_CODES.map(async (country) => ({ country, options: await getDeliveryOptions({ country }, [{ size, quantity: 1 }]) })),
  );
  return all.filter(({ options }) => options.length > 0);
}

/** The countries a customer can choose now: those with at least one delivery option switched on. */
export async function listShippingCountries(): Promise<ShippingCountry[]> {
  return (await listDeliveryOptionsByCountry()).map(({ country }) => country);
}
