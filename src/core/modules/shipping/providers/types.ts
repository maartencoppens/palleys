import type { KeychainSize } from "@/data/sizes";
import type { DeliveryAddress, DeliveryOption } from "../types";

export type Parcel = { weightGrams: number; dimensionsCm: { length: number; width: number; height: number } };

/*
 * A carrier integration. The static provider is the first implementation; Sendcloud (Dynamic Checkout API v3 +
 * Shipments API v3) or MyParcel BE implement the same interface once an account exists. createShipment comes
 * with the label flow in the backoffice (plan phase 6).
 */
export interface ShippingProvider {
  readonly name: string;
  getDeliveryOptions(input: {
    address: DeliveryAddress;
    parcel: Parcel;
    items: { size: KeychainSize; quantity: number }[];
  }): Promise<DeliveryOption[]>;
}
