import { z } from "zod";
import { animals } from "@/data/options";
import { LINE_ATTRIBUTES } from "@/data/shopify";
import type { AnimalType } from "@/data/animals";
import type { OrderPaidPayload } from "./types";

type LineProperties = OrderPaidPayload["line_items"][number]["properties"];

/** The preview ID we put on the cart line as a hidden attribute, if it's a valid UUID. */
export function previewIdOf(properties: LineProperties): string | null {
  const value = properties?.find((p) => p.name === LINE_ATTRIBUTES.previewId)?.value;
  const parsed = z.uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** PAL-GP-KEY-DOG → "HOND" (backoffice code), or null for an unknown SKU. */
export function animalTypeFromSku(sku: string | null | undefined): AnimalType | null {
  const skuCode = sku?.split("-").slice(3).join("-");
  return animals.find((a) => a.skuCode === skuCode)?.animalType ?? null;
}
