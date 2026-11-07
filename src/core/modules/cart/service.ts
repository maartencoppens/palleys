import { LOCALES, type Locale } from "@/core/locale/config";
import { localizedTexts } from "@/core/modules/collectibles/translations";
import "server-only";
import { prisma } from "@/db/client";
import { canTransition } from "@/core/modules/previews/status";
import { createDownloadUrl, objectExists } from "@/core/networking/external/storage-client";
import { DEFAULT_SIZE, isSize, priceFor, variantFor, variantLabel } from "@/core/modules/catalog/utils";
import { findOrderableCollectible } from "@/core/modules/collectibles/service";
import { collectibleImageUrl } from "@/core/modules/collectibles/utils";
import { getShopSettings } from "@/core/modules/settings/service";
import type { CatalogSettings } from "@/core/modules/settings/types";
import { createToken, hashToken } from "@/core/utils/tokens";
import { CART_TTL_MS } from "@/data/checkout";
import { CURRENCY, MAX_LINE_QUANTITY, MAX_ORDER_LINES } from "@/data/pricing";
import { attachments, DEFAULT_ATTACHMENT, type Attachment, type Edition } from "@/data/options";
import { findAnimal } from "@/core/modules/animals/utils";
import type { KeychainSize } from "@/data/sizes";
import { attachmentSchema, editionSchema } from "./types";
import type {
  AddCollectibleToCartInput,
  AddToCartInput,
  CartLineView,
  CartView,
  RemoveFromCartInput,
  UpdateCartLineInput,
} from "./types";

/*
 * Our own cart. The browser holds a random token in an httpOnly cookie; we store only its hash. A line is either a
 * preview with a configurator choice or a collectible, and never holds a price: prices come from the settings and the
 * collectible every time. A line that can no longer be bought (paid, expired or deleted preview; hidden or sold-out
 * collectible) silently drops out, which is also how the cart empties itself after a successful payment.
 */

export type CartErrorCode =
  | "preview_not_found"
  | "preview_not_orderable"
  | "option_unavailable"
  | "collectible_unavailable"
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
  attachment: true,
  animal: true,
  size: true,
  notes: true,
  quantity: true,
  createdAt: true,
  preview: { select: { status: true, expiresAt: true } },
  collectible: {
    select: {
      id: true,
      name: true,
      translations: true,
      sku: true,
      priceCents: true,
      imageKey: true,
      published: true,
      soldOut: true,
      archivedAt: true,
    },
  },
} as const;

type StoredLine = {
  id: string;
  previewId: string | null;
  edition: string | null;
  attachment: string | null;
  animal: string | null;
  size: string;
  notes: string | null;
  quantity: number;
  preview: { status: Parameters<typeof canTransition>[0]; expiresAt: Date | null } | null;
  collectible: {
    id: string;
    name: string;
    translations: unknown;
    sku: string;
    priceCents: number;
    imageKey: string | null;
    published: boolean;
    soldOut: boolean;
    archivedAt: Date | null;
  } | null;
};

/** A cart line resolved against the catalog: what checkout needs. */
export type ResolvedCartLine = {
  id: string;
  size: KeychainSize;
  sku: string;
  /** Dutch, as the order item and the backoffice keep it. */
  title: string;
  /** What the shopper reads in each language. */
  titles: Record<Locale, string>;
  notes: string | null;
  quantity: number;
  unitCents: number;
} & (
  | {
      kind: "personalized";
      previewId: string;
      collectibleId: null;
      edition: Edition;
      attachment: Attachment | null;
      animal: string;
      animalLabel: string;
      animalLabels: Record<Locale, string>;
      editionLabel: string;
      attachmentLabel: string | null;
      imageUrl: null;
    }
  | {
      kind: "collectible";
      previewId: null;
      collectibleId: string;
      edition: null;
      attachment: Attachment;
      animal: null;
      animalLabel: null;
      animalLabels: null;
      editionLabel: null;
      attachmentLabel: string;
      imageUrl: string | null;
    }
);

function isExpired(expiresAt: Date | null) {
  return expiresAt !== null && expiresAt.getTime() <= Date.now();
}

export function isPreviewOrderable(preview: NonNullable<StoredLine["preview"]>) {
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

// A line from before the choice existed, or a collectible nobody has chosen for yet, gets the standard one.
const chosenAttachment = (value: string | null) => attachmentSchema.safeParse(value).data ?? DEFAULT_ATTACHMENT;
const labelOf = (value: Attachment) => attachments.find((option) => option.value === value)!.label;

function resolveLine(line: StoredLine, catalog: CatalogSettings): ResolvedCartLine | null {
  if (line.collectible) {
    const collectible = line.collectible;
    if (!collectible.published || collectible.soldOut || collectible.archivedAt) return null;
    const attachment = chosenAttachment(line.attachment);
    return {
      id: line.id,
      kind: "collectible",
      previewId: null,
      collectibleId: collectible.id,
      edition: null,
      attachment,
      animal: null,
      size: DEFAULT_SIZE,
      sku: collectible.sku,
      title: collectible.name,
      titles: Object.fromEntries(
        LOCALES.map((locale) => [locale, localizedTexts({ ...collectible, description: null, tag: null }, locale).name]),
      ) as Record<Locale, string>,
      animalLabel: null,
      animalLabels: null,
      editionLabel: null,
      attachmentLabel: labelOf(attachment),
      notes: null,
      quantity: line.quantity,
      unitCents: collectible.priceCents,
      imageUrl: collectibleImageUrl(collectible.imageKey),
    };
  }

  if (!line.previewId || !line.preview || !isPreviewOrderable(line.preview)) return null;
  const edition = editionSchema.safeParse(line.edition);
  // An animal that was removed from the list can't be bought anymore.
  const animal = findAnimal(catalog.animals, line.animal);
  if (!edition.success || !animal || !isSize(line.size)) return null;
  const variant = variantFor(edition.data, animal, line.size);
  const labels = variantLabel(edition.data, animal);
  const attachment = edition.data === "keychain" ? chosenAttachment(line.attachment) : null;
  const attachmentLabel = attachment && labelOf(attachment);
  const title = [labels.title, labels.edition, attachmentLabel].filter(Boolean).join(" · ");
  return {
    id: line.id,
    kind: "personalized",
    previewId: line.previewId,
    collectibleId: null,
    edition: edition.data,
    attachment,
    animal: animal.value,
    size: line.size,
    sku: variant.sku,
    title,
    // The shop names a Palley from its choices in its own texts.
    titles: Object.fromEntries(LOCALES.map((locale) => [locale, title])) as Record<Locale, string>,
    animalLabel: labels.animal,
    animalLabels: animal.labels,
    editionLabel: labels.edition,
    attachmentLabel,
    notes: line.notes,
    quantity: line.quantity,
    unitCents: priceFor(variant, catalog.prices),
    imageUrl: null,
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

export async function findCartId(token: string | null) {
  return (await findCart(token))?.id ?? null;
}

/** Valid lines of a cart, after dropping the ones that can't be bought anymore. */
async function loadLines(cartId: string): Promise<ResolvedCartLine[]> {
  const lines = await prisma.cartLine.findMany({
    where: { cartId },
    orderBy: { createdAt: "asc" },
    select: LINE_SELECT,
  });
  const { catalog } = await getShopSettings();
  const resolved: ResolvedCartLine[] = [];
  const stale: string[] = [];
  for (const line of lines) {
    const ok = resolveLine(line, catalog);
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
  const photoUrls = await photoUrlsFor(lines.flatMap((line) => line.previewId ?? []));
  const views: CartLineView[] = lines.map((line) => ({
    id: line.id,
    kind: line.kind,
    productTitles: line.titles,
    animal: line.animal,
    animalLabels: line.animalLabels,
    edition: line.edition,
    attachment: line.attachment,
    notes: line.notes,
    quantity: line.quantity,
    unitCents: line.unitCents,
    total: money(line.unitCents * line.quantity),
    photoUrl: line.kind === "personalized" ? (photoUrls.get(line.previewId) ?? null) : line.imageUrl,
    withdrawable: line.kind === "collectible",
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

/** The visitor's cart, or a new one (with its new token, which the route puts in the cookie). */
async function findOrCreateCart(token: string | null) {
  const cart = await findCart(token);
  if (cart && token) return { cart, cartToken: token };
  const cartToken = createToken();
  const created = await prisma.cart.create({
    data: { tokenHash: hashToken(cartToken), expiresAt: nextExpiry() },
    select: { id: true, expiresAt: true },
  });
  return { cart: created, cartToken };
}

/** Adds a preview. Returns a new token when a cart had to be created (the route sets the cookie). */
export async function addPreviewToCart(
  token: string | null,
  input: AddToCartInput,
): Promise<{ cart: CartView; token: string }> {
  await assertPreviewCanBeOrdered(input.previewId);

  const { catalog } = await getShopSettings();
  const animalOnSale = findAnimal(catalog.animals, input.animal) && !catalog.disabledAnimals.includes(input.animal);
  if (!animalOnSale || catalog.disabledEditions.includes(input.edition)) {
    throw new CartError("option_unavailable");
  }

  const { cart, cartToken } = await findOrCreateCart(token);

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
      attachment: input.edition === "keychain" ? (input.attachment ?? null) : null,
      animal: input.animal,
      size: DEFAULT_SIZE,
      notes: input.notes || null,
    },
    update: {},
  });
  await prisma.cart.update({ where: { id: cart.id }, data: { expiresAt: nextExpiry() } });
  return { cart: await toView(await loadLines(cart.id)), token: cartToken };
}

/** Adds a collectible. Adding the same one again is one more copy, up to the line's maximum. */
export async function addCollectibleToCart(
  token: string | null,
  input: AddCollectibleToCartInput,
): Promise<{ cart: CartView; token: string }> {
  if (!(await findOrderableCollectible(input.collectibleId))) throw new CartError("collectible_unavailable");

  const { cart, cartToken } = await findOrCreateCart(token);
  const key = { cartId: cart.id, collectibleId: input.collectibleId };
  const existing = await prisma.cartLine.findUnique({ where: { cartId_collectibleId: key }, select: { quantity: true } });

  if (existing) {
    await prisma.cartLine.update({
      where: { cartId_collectibleId: key },
      data: { quantity: Math.min(existing.quantity + 1, MAX_LINE_QUANTITY) },
    });
  } else {
    const lineCount = await prisma.cartLine.count({ where: { cartId: cart.id } });
    if (lineCount >= MAX_ORDER_LINES) throw new CartError("cart_full");
    await prisma.cartLine.create({ data: { ...key, size: DEFAULT_SIZE } });
  }
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
    // A figurine has nothing to attach.
    where: { id: input.lineId, cartId: cart.id, ...(input.attachment && { OR: [{ edition: null }, { edition: { not: "figure" } }] }) },
    data: { quantity: input.quantity, attachment: input.attachment },
  });
  if (count === 0) throw new CartError("line_not_found");
  return toView(await loadLines(cart.id));
}

export async function deleteExpiredCarts() {
  const { count } = await prisma.cart.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return count;
}
