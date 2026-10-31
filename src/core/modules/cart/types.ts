import { z } from "zod";
import { animals, editions, type Animal, type Edition } from "@/data/options";
import { MAX_NOTES_LENGTH } from "@/data/checkout";
import { MAX_LINE_QUANTITY } from "@/data/pricing";

const animalValues = animals.map((a) => a.value) as [Animal, ...Animal[]];
const editionValues = editions.map((e) => e.value) as [Edition, ...Edition[]];

export const animalSchema = z.enum(animalValues);
export const editionSchema = z.enum(editionValues);

// The client sends a preview, a choice and notes. Never a price.
export const addToCartSchema = z.object({
  previewId: z.uuid(),
  animal: animalSchema,
  edition: editionSchema,
  notes: z.string().trim().max(MAX_NOTES_LENGTH).optional(),
});

export const removeFromCartSchema = z.object({ lineId: z.uuid() });

export const updateCartLineSchema = z.object({
  lineId: z.uuid(),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>;
export type UpdateCartLineInput = z.infer<typeof updateCartLineSchema>;

export type Money = { amount: number; currencyCode: string };

/** Cart line as the frontend sees it. Amounts in euros for display; the server works in cents. */
export type CartLineView = {
  id: string;
  previewId: string;
  productTitle: string;
  animal: string;
  edition: string;
  notes: string | null;
  quantity: number;
  unitCents: number;
  total: Money;
  /** Short-lived signed URL of the shopper's first photo, null when unavailable. */
  photoUrl: string | null;
};

export type CartView = {
  totalQuantity: number;
  subtotalCents: number;
  subtotal: Money;
  lines: CartLineView[];
};
