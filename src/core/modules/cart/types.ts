import { z } from "zod";
import { animals, attachments, editions, type Animal, type Attachment, type Edition } from "@/data/options";
import { MAX_NOTES_LENGTH } from "@/data/checkout";
import { MAX_LINE_QUANTITY } from "@/data/pricing";
import type { Locale } from "@/core/locale/config";

const animalValues = animals.map((a) => a.value) as [Animal, ...Animal[]];
const editionValues = editions.map((e) => e.value) as [Edition, ...Edition[]];

export const animalSchema = z.enum(animalValues);
export const editionSchema = z.enum(editionValues);
export const attachmentSchema = z.enum(attachments.map((a) => a.value) as [Attachment, ...Attachment[]]);

// The client sends a preview, a choice and notes. Never a price.
export const addToCartSchema = z
  .object({
    previewId: z.uuid(),
    animal: animalSchema,
    edition: editionSchema,
    attachment: attachmentSchema.optional(),
    notes: z.string().trim().max(MAX_NOTES_LENGTH).optional(),
  })
  .refine((input) => input.edition !== "keychain" || input.attachment, { path: ["attachment"] });

export const addCollectibleToCartSchema = z.object({ collectibleId: z.uuid() });

export const removeFromCartSchema = z.object({ lineId: z.uuid() });

export const updateCartLineSchema = z.object({
  lineId: z.uuid(),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY).optional(),
  attachment: attachmentSchema.optional(),
}).refine((input) => input.quantity !== undefined || input.attachment, { path: ["quantity"] });

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type AddCollectibleToCartInput = z.infer<typeof addCollectibleToCartSchema>;
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>;
export type UpdateCartLineInput = z.infer<typeof updateCartLineSchema>;

export type Money = { amount: number; currencyCode: string };

/** Cart line as the frontend sees it. Amounts in euros for display; the server works in cents. */
export type CartLineView = {
  id: string;
  kind: "personalized" | "collectible";
  /** The collectible's name per language; a personalised Palley gets its name from the shop's texts. */
  productTitles: Record<Locale, string>;
  /** The choices as values, which the shop shows in its language. Null for a collectible. */
  animal: Animal | null;
  edition: Edition | null;
  /** Every keychain has one, a figurine doesn't. */
  attachment: Attachment | null;
  notes: string | null;
  quantity: number;
  unitCents: number;
  total: Money;
  /** Short-lived signed URL of the shopper's first photo or the collectible's image, null when unavailable. */
  photoUrl: string | null;
  /** May be sent back within 14 days. A personalised Palley may not (art. VI.53, 3° WER). */
  withdrawable: boolean;
};

export type CartView = {
  totalQuantity: number;
  subtotalCents: number;
  subtotal: Money;
  lines: CartLineView[];
};
