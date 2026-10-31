import "server-only";
import { prisma } from "@/db/client";
import { canTransition } from "@/core/modules/previews/status";
import { createDownloadUrl, objectExists } from "@/core/networking/external/storage-client";
import { DEFAULT_SIZE, getVariant, isSize, priceFor, variantFor, variantLabel } from "@/core/modules/catalog/utils";
import { createToken, hashToken } from "@/core/utils/tokens";
import { CART_TTL_MS } from "@/data/checkout";
import { CURRENCY, MAX_ORDER_LINES } from "@/data/pricing";
import type { Animal, Edition } from "@/data/options";
import type { KeychainSize } from "@/data/sizes";
import { animalSchema, editionSchema } from "./types";
import type { AddToCartInput, CartLineView, CartView, RemoveFromCartInput, UpdateCartLineInput } from "./types";

/*
 * Our own cart. The browser holds a random token in an httpOnly cookie; we store only its hash. Lines refer to
 * previews and a configurator choice, never to a price: prices come from src/data/pricing.ts every time.
 * A line whose preview can no longer be bought (paid, expired, deleted) silently drops out, which is also how
 * the cart empties itself after a successful payment.
 */

export type CartErrorCode =
  | "preview_not_found"
  | "preview_not_orderable"
  | "photos_missing"
  | "line_not_found"
  | "cart_full";

export class CartError extends Error {
  constructor(public readonly code: CartErrorCode) {
    super(code);
  }
}

const LINE_SELECT = {
  id: true,
  previewId: true,
  edition: true,
  animal: true,
  size: true,
  notes: true,
  quantity: true,
  createdAt: true,
  preview: { select: { status: true, expiresAt: true } },
} as const;

type StoredLine = {
  id: string;
  previewId: string;
  edition: string;
  animal: string;
  size: string;
  notes: string | null;
  quantity: number;
  preview: { status: Parameters<typeof canTransition>[0]; expiresAt: Date | null };
};

/** A cart line resolved against the catalog: what checkout needs. */
export type ResolvedCartLine = {
  id: string;
  previewId: string;
  edition: Edition;
  animal: Animal;
  size: KeychainSize;
  sku: string;
  title: string;
  animalLabel: string;
  editionLabel: string;
  notes: string | null;
  quantity: number;
  unitCents: number;
};

function isExpired(expiresAt: Date | null) {
  return expiresAt !== null && expiresAt.getTime() <= Date.now();
}

export function isPreviewOrderable(preview: StoredLine["preview"]) {
  return canTransition(preview.status, "PAID") && !isExpired(preview.expiresAt);
}

/** A preview may be bought while it's still unpaid, unexpired and its photos are really in R2. */
export async function assertPreviewCanBeOrdered(previewId: string) {
  const preview = await prisma.preview.findUnique({
    where: { id: previewId },
    select: { status: true, expiresAt: true, photos: { select: { key: true } } },
  });
  if (!preview) throw new CartError("preview_not_found");
  if (!isPreviewOrderable(preview)) throw new CartError("preview_not_orderable");
  // The browser uploads straight to R2, so only a HEAD request proves the photos arrived.
  const present = await Promise.all(preview.photos.map((photo) => objectExists(photo.key)));
  if (present.length === 0 || present.includes(false)) throw new CartError("photos_missing");
}

function resolveLine(line: StoredLine): ResolvedCartLine | null {
  const edition = editionSchema.safeParse(line.edition);
  const animal = animalSchema.safeParse(line.animal);
  if (!edition.success || !animal.success || !isSize(line.size)) return null;
  const variant = variantFor(edition.data, animal.data, line.size);
  if (!getVariant(variant.sku, variant.size)) return null;
  const labels = variantLabel(edition.data, animal.data);
  return {
    id: line.id,
    previewId: line.previewId,
    edition: edition.data,
    animal: animal.data,
    size: line.size,
    sku: variant.sku,
    title: `${labels.title} · ${labels.edition}`,
    animalLabel: labels.animal,
    editionLabel: labels.edition,
    notes: line.notes,
    quantity: line.quantity,
    unitCents: priceFor(variant),
  };
}

async function findCart(token: string | null) {
  if (!token || token.length > 128) return null;
  const cart = await prisma.cart.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, expiresAt: true },
  });
  if (!cart || cart.expiresAt.getTime() <= Date.now()) return null;
  return cart;
}

/** Valid lines of a cart, after dropping the ones that can't be bought anymore. */
async function loadLines(cartId: string): Promise<ResolvedCartLine[]> {
  const lines = await prisma.cartLine.findMany({
    where: { cartId },
    orderBy: { createdAt: "asc" },
    select: LINE_SELECT,
  });
  const resolved: ResolvedCartLine[] = [];
  const stale: string[] = [];
  for (const line of lines) {
    const ok = isPreviewOrderable(line.preview) ? resolveLine(line) : null;
    if (ok) resolved.push(ok);
    else stale.push(line.id);
  }
  if (stale.length > 0) await prisma.cartLine.deleteMany({ where: { id: { in: stale }, cartId } });
  return resolved;
}

/** Signed URLs of each preview's first customer photo, for thumbnails. */
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

const money = (cents: number) => ({ amount: cents / 100, currencyCode: CURRENCY });

async function toView(lines: ResolvedCartLine[]): Promise<CartView> {
  const photoUrls = await photoUrlsFor(lines.map((line) => line.previewId));
  const views: CartLineView[] = lines.map((line) => ({
    id: line.id,
    previewId: line.previewId,
    productTitle: `Palley ${line.animalLabel}`,
    animal: line.animalLabel,
    edition: line.editionLabel,
    notes: line.notes,
    quantity: line.quantity,
    unitCents: line.unitCents,
    total: money(line.unitCents * line.quantity),
    photoUrl: photoUrls.get(line.previewId) ?? null,
  }));
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
  return {
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalCents,
    subtotal: money(subtotalCents),
    lines: views,
  };
}

function nextExpiry() {
  return new Date(Date.now() + CART_TTL_MS);
}

export async function getCart(token: string | null): Promise<CartView | null> {
  const cart = await findCart(token);
  if (!cart) return null;
  return toView(await loadLines(cart.id));
}

/** Lines for checkout: validated against previews and catalog, prices from config. */
export async function getCheckoutLines(token: string | null): Promise<ResolvedCartLine[]> {
  const cart = await findCart(token);
  return cart ? loadLines(cart.id) : [];
}

/** Adds a preview. Returns a new token when a cart had to be created (the route sets the cookie). */
export async function addPreviewToCart(
  token: string | null,
  input: AddToCartInput,
): Promise<{ cart: CartView; token: string }> {
  await assertPreviewCanBeOrdered(input.previewId);

  let cart = await findCart(token);
  let cartToken = token;
  if (!cart || !cartToken) {
    cartToken = createToken();
    cart = await prisma.cart.create({
      data: { tokenHash: hashToken(cartToken), expiresAt: nextExpiry() },
      select: { id: true, expiresAt: true },
    });
  }

  const lineCount = await prisma.cartLine.count({ where: { cartId: cart.id } });
  if (lineCount >= MAX_ORDER_LINES) throw new CartError("cart_full");

  // One line per preview: every Palley is a different pet. Adding it again (double click, back button) keeps
  // the existing line; extra copies go through the quantity.
  await prisma.cartLine.upsert({
    where: { cartId_previewId: { cartId: cart.id, previewId: input.previewId } },
    create: {
      cartId: cart.id,
      previewId: input.previewId,
      edition: input.edition,
      animal: input.animal,
      size: DEFAULT_SIZE,
      notes: input.notes || null,
    },
    update: {},
  });
  await prisma.cart.update({ where: { id: cart.id }, data: { expiresAt: nextExpiry() } });
  return { cart: await toView(await loadLines(cart.id)), token: cartToken };
}

export async function removeFromCart(token: string | null, input: RemoveFromCartInput): Promise<CartView | null> {
  const cart = await findCart(token);
  if (!cart) return null;
  // Scoped to this cart: a line id from someone else's cart does nothing.
  await prisma.cartLine.deleteMany({ where: { id: input.lineId, cartId: cart.id } });
  return toView(await loadLines(cart.id));
}

export async function updateCartLineQuantity(
  token: string | null,
  input: UpdateCartLineInput,
): Promise<CartView | null> {
  const cart = await findCart(token);
  if (!cart) return null;
  const { count } = await prisma.cartLine.updateMany({
    where: { id: input.lineId, cartId: cart.id },
    data: { quantity: input.quantity },
  });
  if (count === 0) throw new CartError("line_not_found");
  return toView(await loadLines(cart.id));
}

export async function deleteExpiredCarts() {
  const { count } = await prisma.cart.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return count;
}
