import { z } from "zod";
import { animals, editions, type Animal, type Edition } from "@/data/options";
import { MAX_NOTES_LENGTH } from "@/data/shopify";

const animalValues = animals.map((a) => a.value) as [Animal, ...Animal[]];
const editionValues = editions.map((e) => e.value) as [Edition, ...Edition[]];

export const addToCartSchema = z.object({
  previewId: z.uuid(),
  animal: z.enum(animalValues),
  edition: z.enum(editionValues),
  notes: z.string().trim().max(MAX_NOTES_LENGTH).optional(),
});

export const removeFromCartSchema = z.object({
  lineId: z.string().min(1).max(300),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>;

/** What a shopper's request brings along to every cart call. */
export type CartContext = { cartId: string | null; buyerIp: string | null };

export type Money = { amount: number; currencyCode: string };

/** Cart as the frontend sees it: no Shopify GIDs beyond what's needed to remove a line. */
export type CartLineView = {
  id: string;
  previewId: string | null;
  productTitle: string;
  animal: string | null;
  edition: string | null;
  notes: string | null;
  quantity: number;
  total: Money;
  /** Short-lived signed URL of the shopper's first photo, null when unavailable. */
  photoUrl: string | null;
};

export type CartView = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  subtotal: Money;
  lines: CartLineView[];
};

// ---------- Raw Storefront API shapes (only the fields we query) ----------

export type ShopifyMoney = { amount: string; currencyCode: string };
export type ShopifyUserError = { field: string[] | null; message: string };

export type ShopifyCartLine = {
  id: string;
  quantity: number;
  attributes: { key: string; value: string | null }[];
  cost: { totalAmount: ShopifyMoney };
  merchandise: {
    id: string;
    sku: string | null;
    selectedOptions: { name: string; value: string }[];
    product: { title: string };
  };
};

export type ShopifyCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: ShopifyMoney };
  lines: { nodes: ShopifyCartLine[] };
};

export type CartLineInput = {
  merchandiseId: string;
  quantity: number;
  attributes: { key: string; value: string }[];
};
