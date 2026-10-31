import "server-only";
import { parcelFor } from "@/core/modules/catalog/utils";
import type { KeychainSize } from "@/data/sizes";
import { staticShippingProvider } from "./providers/static";
import type { ShippingProvider } from "./providers/types";
import type { DeliveryAddress, DeliveryOption } from "./types";

// The carrier integration in use. When Sendcloud is connected: try it first, fall back to the static options
// (logged), so checkout never blocks on a carrier outage.
const provider: ShippingProvider = staticShippingProvider;

export async function getDeliveryOptions(
  address: DeliveryAddress,
  items: { size: KeychainSize; quantity: number }[],
): Promise<DeliveryOption[]> {
  return provider.getDeliveryOptions({ address, parcel: parcelFor(items), items });
}

/** Re-checks a chosen option server-side: it must still exist for this address, with our current price. */
export async function resolveDeliveryOption(
  optionId: string,
  address: DeliveryAddress,
  items: { size: KeychainSize; quantity: number }[],
): Promise<DeliveryOption | null> {
  const options = await getDeliveryOptions(address, items);
  return options.find((option) => option.id === optionId) ?? null;
}
