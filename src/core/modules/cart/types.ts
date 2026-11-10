import { z } from "zod";
import { attachments, editions, type Attachment, type Edition } from "@/data/options";
import { animalOptionSchema } from "@/core/modules/animals/types";
import { MAX_NOTES_LENGTH } from "@/data/checkout";
import { MAX_LINE_QUANTITY } from "@/data/pricing";
import type { Locale } from "@/core/locale/config";

const editionValues = editions.map((e) => e.value) as [Edition, ...Edition[]];

// Any well-formed value; whether the shop still sells that animal is checked against the live list.
export const animalSchema = animalOptionSchema.shape.value;
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

// A collectible comes as a keychain (with a clip or a key ring) or as a figurine. Older clients send only the id.
export const addCollectibleToCartSchema = z.object({
  collectibleId: z.uuid(),
  edition: editionSchema.default("keychain"),
  attachment: attachmentSchema.optional(),
});

export const removeFromCartSchema = z.object({ lineId: z.uuid() });

// Changing a line in the cart: how many, and the choices. Animal and notes only on a Palley op maat.
export const updateCartLineSchema = z
  .object({
    lineId: z.uuid(),
    quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY).optional(),
    edition: editionSchema.optional(),
    attachment: attachmentSchema.optional(),
    animal: animalSchema.optional(),
    notes: z.string().trim().max(MAX_NOTES_LENGTH).optional(),
  })
  .refine(
    (input) => [input.quantity, input.edition, input.attachment, input.animal, input.notes].some((value) => value !== undefined),
    { path: ["quantity"] },
  );

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type AddCollectibleToCartInput = z.infer<typeof addCollectibleToCartSchema>;
// What the shop sends: the edition may be left out (keychain).
export type AddCollectibleToCartRequest = z.input<typeof addCollectibleToCartSchema>;
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>;
export type UpdateCartLineInput = z.infer<typeof updateCartLineSchema>;

export type Money = { amount: number; currencyCode: string };

/** Cart line as the frontend sees it. Amounts in euros for display; the server works in cents. */
export type CartLineView = {
  id: string;
  kind: "personalized" | "collectible";
  /** The collectible's name per language; a personalised Palley gets its name from the shop's texts. */
  productTitles: Record<Locale, string>;
  /** The animal as a value, which the shop shows in its language. Null for a collectible. */
  animal: string | null;
  /** The animal's name per language, from the live list. Null for a collectible. */
  animalLabels: Record<Locale, string> | null;
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
