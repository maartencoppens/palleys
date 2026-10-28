import "server-only";
import { prisma } from "@/db/client";
import { createDownloadUrl, objectExists } from "@/core/networking/external/storage-client";
import { canTransition } from "@/core/modules/previews/status";
import { animals, editions, getVariant } from "@/data/options";
import { LINE_ATTRIBUTES } from "@/data/shopify";
import { addCartLines, createCart, fetchCart, getVariantBySku, removeCartLines } from "./cart";
import type {
  AddToCartInput,
  CartContext,
  CartLineView,
  CartView,
  RemoveFromCartInput,
  ShopifyCart,
} from "./types";

/*
 * Cart orchestration: decides which preview may go into a Shopify cart and turns Shopify's cart
 * into what the site shows. The cart itself lives at Shopify; we only keep its ID in a cookie.
 */

export type CartErrorCode =
  | "preview_not_found"
  | "preview_not_orderable"
  | "photos_missing"
  | "variant_unavailable";

export class CartError extends Error {
  constructor(public readonly code: CartErrorCode) {
    super(code);
  }
}

/** A preview may be bought once, while it's still unpaid, unexpired and its photos are really in R2. */
async function assertPreviewCanBeOrdered(previewId: string) {
  const preview = await prisma.preview.findUnique({
    where: { id: previewId },
    select: { status: true, expiresAt: true, photos: { select: { key: true } } },
  });
  if (!preview) throw new CartError("preview_not_found");
  if (!canTransition(preview.status, "PAID") || isExpired(preview.expiresAt)) {
    throw new CartError("preview_not_orderable");
  }
  // The browser uploads straight to R2, so only a HEAD request proves the photos arrived.
  const present = await Promise.all(preview.photos.map((photo) => objectExists(photo.key)));
  if (present.length === 0 || present.includes(false)) throw new CartError("photos_missing");
}

function isExpired(expiresAt: Date | null) {
  return expiresAt !== null && expiresAt.getTime() <= Date.now();
}

const attribute = (line: ShopifyCart["lines"]["nodes"][number], key: string) =>
  line.attributes.find((a) => a.key === key)?.value ?? null;

const labelFor = (
  options: readonly { label: string; shopifyValue: string }[],
  shopifyValue: string | undefined,
) => options.find((o) => o.shopifyValue === shopifyValue)?.label ?? shopifyValue ?? null;

/** Signed URLs of each preview's first customer photo, for thumbnails in the cart. */
async function photoUrlsFor(previewIds: string[]) {
  if (previewIds.length === 0) return new Map<string, string>();
  const photos = await prisma.previewPhoto.findMany({
    where: { previewId: { in: previewIds }, uploadedBy: null },
    orderBy: { createdAt: "asc" },
    select: { previewId: true, key: true },
  });
  const firstKey = new Map<string, string>();
  for (const photo of photos) if (!firstKey.has(photo.previewId)) firstKey.set(photo.previewId, photo.key);
  const entries = await Promise.all(
    [...firstKey].map(async ([previewId, key]) => [previewId, await createDownloadUrl(key)] as const),
  );
  return new Map(entries);
}

async function toView(cart: ShopifyCart): Promise<CartView> {
  const previewIds = cart.lines.nodes
    .map((line) => attribute(line, LINE_ATTRIBUTES.previewId))
    .filter((id): id is string => Boolean(id));
  const photoUrls = await photoUrlsFor(previewIds);

  const lines: CartLineView[] = cart.lines.nodes.map((line) => {
    const option = (name: string) =>
      line.merchandise.selectedOptions.find((o) => o.name === name)?.value;
    const previewId = attribute(line, LINE_ATTRIBUTES.previewId);
    return {
      id: line.id,
      previewId,
      productTitle: line.merchandise.product.title,
      animal: labelFor(animals, option("Dier")),
      edition: labelFor(editions, option("Uitvoering")),
      notes: attribute(line, LINE_ATTRIBUTES.notes),
      quantity: line.quantity,
      total: {
        amount: Number(line.cost.totalAmount.amount),
        currencyCode: line.cost.totalAmount.currencyCode,
      },
      photoUrl: previewId ? (photoUrls.get(previewId) ?? null) : null,
    };
  });

  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    totalQuantity: cart.totalQuantity,
    subtotal: {
      amount: Number(cart.cost.subtotalAmount.amount),
      currencyCode: cart.cost.subtotalAmount.currencyCode,
    },
    lines,
  };
}

/**
 * Lines whose preview can no longer be bought (expired, deleted, already paid elsewhere). Lines
 * without a preview ID are left alone: those are regular products, not custom Palleys.
 */
async function staleLineIds(cart: ShopifyCart) {
  const byPreview = new Map<string, string>();
  for (const line of cart.lines.nodes) {
    const previewId = attribute(line, LINE_ATTRIBUTES.previewId);
    if (previewId) byPreview.set(previewId, line.id);
  }
  if (byPreview.size === 0) return [];
  const previews = await prisma.preview.findMany({
    where: { id: { in: [...byPreview.keys()] } },
    select: { id: true, status: true, expiresAt: true },
  });
  const orderable = new Set(
    previews
      .filter((p) => canTransition(p.status, "PAID") && !isExpired(p.expiresAt))
      .map((p) => p.id),
  );
  return [...byPreview].filter(([previewId]) => !orderable.has(previewId)).map(([, lineId]) => lineId);
}

export async function getCart({ cartId, buyerIp }: CartContext): Promise<CartView | null> {
  if (!cartId) return null;
  let cart = await fetchCart(cartId, { buyerIp });
  if (!cart) return null;
  const stale = await staleLineIds(cart);
  if (stale.length > 0) cart = await removeCartLines(cart.id, stale, { buyerIp });
  return toView(cart);
}

export async function addPreviewToCart(
  { cartId, buyerIp }: CartContext,
  input: AddToCartInput,
): Promise<CartView> {
  await assertPreviewCanBeOrdered(input.previewId);

  const { sku } = getVariant(input.edition, input.animal);
  const variant = await getVariantBySku(sku);
  if (!variant?.availableForSale) throw new CartError("variant_unavailable");

  const attributes: { key: string; value: string }[] = [
    { key: LINE_ATTRIBUTES.previewId, value: input.previewId },
  ];
  if (input.notes) attributes.push({ key: LINE_ATTRIBUTES.notes, value: input.notes });
  // One line per preview, always quantity 1: every Palley is a different pet.
  const lines = [{ merchandiseId: variant.id, quantity: 1, attributes }];

  const existing = cartId ? await fetchCart(cartId, { buyerIp }) : null;
  if (!existing) return toView(await createCart(lines, { buyerIp }));

  // Adding the same preview twice (double click, back button) keeps the cart as it is.
  const alreadyIn = existing.lines.nodes.some(
    (line) => attribute(line, LINE_ATTRIBUTES.previewId) === input.previewId,
  );
  if (alreadyIn) return toView(existing);
  return toView(await addCartLines(existing.id, lines, { buyerIp }));
}

export async function removeFromCart(
  { cartId, buyerIp }: CartContext,
  input: RemoveFromCartInput,
): Promise<CartView | null> {
  if (!cartId) return null;
  return toView(await removeCartLines(cartId, [input.lineId], { buyerIp }));
}
