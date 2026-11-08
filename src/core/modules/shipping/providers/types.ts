import type { KeychainSize } from "@/data/sizes";
import type { DeliveryAddress, DeliveryOption } from "../types";

export type Parcel = { weightGrams: number; dimensionsCm: { length: number; width: number; height: number } };

/*
 * Where delivery options come from. The static provider is the only one: fixed options with prices from the
 * settings. A carrier integration would implement the same interface.
 */
export interface ShippingProvider {
  readonly name: string;
  getDeliveryOptions(input: {
    address: DeliveryAddress;
    parcel: Parcel;
    items: { size: KeychainSize; quantity: number }[];
  }): Promise<DeliveryOption[]>;
}
