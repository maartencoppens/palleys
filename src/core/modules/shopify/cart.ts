import "server-only";
import {
  storefrontQuery,
  ShopifyError,
} from "@/core/networking/external/shopify-client";
import { SHOPIFY_PRODUCT_HANDLE } from "@/data/options";
import { SHOPIFY_CONTEXT, VARIANT_CACHE_TTL_MS } from "@/data/shopify";
import type { CartLineInput, ShopifyCart, ShopifyUserError } from "./types";

/*
 * Storefront API cart operations. Plain GraphQL calls, no business rules: which preview may go in
 * the cart is decided in service.ts. Every operation runs in the Belgian/Dutch market context.
 */

// const IN_CONTEXT = `@inContext(country: ${SHOPIFY_CONTEXT.country}, language: ${SHOPIFY_CONTEXT.language})`;
const IN_CONTEXT = "@inContext(country: BE, language: NL)";

const CART_FIELDS = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost { subtotalAmount { amount currencyCode } }
    lines(first: 50) {
      nodes {
        id
        quantity
        attributes { key value }
        cost { totalAmount { amount currencyCode } }
        merchandise {
          ... on ProductVariant {
            id
            sku
            selectedOptions { name value }
            product { title }
          }
        }
      }
    }
  }
`;

type CartMutationPayload = {
  cart: ShopifyCart | null;
  userErrors: ShopifyUserError[];
};

function unwrap(payload: CartMutationPayload, action: string): ShopifyCart {
  if (payload.userErrors.length > 0 || !payload.cart) {
    const message =
      payload.userErrors.map((e) => e.message).join("; ") || "no cart returned";
    throw new ShopifyError(`Shopify ${action} failed: ${message}`);
  }
  return payload.cart;
}

type Options = { buyerIp?: string | null };

export async function fetchCart(cartId: string, options: Options = {}) {
  const data = await storefrontQuery<{ cart: ShopifyCart | null }>(
    `query Cart($cartId: ID!) ${IN_CONTEXT} { cart(id: $cartId) { ...CartFields } } ${CART_FIELDS}`,
    { cartId },
    options,
  );
  // null: unknown or expired cart, or one that was already checked out.
  return data.cart;
}

export async function createCart(
  lines: CartLineInput[],
  options: Options = {},
) {
  const data = await storefrontQuery<{ cartCreate: CartMutationPayload }>(
    `mutation CartCreate($input: CartInput!) ${IN_CONTEXT} {
      cartCreate(input: $input) { cart { ...CartFields } userErrors { field message } }
    } ${CART_FIELDS}`,
    {
      input: {
        lines,
        buyerIdentity: { countryCode: SHOPIFY_CONTEXT.country },
      },
    },
    options,
  );
  return unwrap(data.cartCreate, "cartCreate");
}

export async function addCartLines(
  cartId: string,
  lines: CartLineInput[],
  options: Options = {},
) {
  const data = await storefrontQuery<{ cartLinesAdd: CartMutationPayload }>(
    `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) ${IN_CONTEXT} {
      cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ...CartFields } userErrors { field message } }
    } ${CART_FIELDS}`,
    { cartId, lines },
    options,
  );
  return unwrap(data.cartLinesAdd, "cartLinesAdd");
}

export async function removeCartLines(
  cartId: string,
  lineIds: string[],
  options: Options = {},
) {
  const data = await storefrontQuery<{ cartLinesRemove: CartMutationPayload }>(
    `mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) ${IN_CONTEXT} {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ...CartFields } userErrors { field message } }
    } ${CART_FIELDS}`,
    { cartId, lineIds },
    options,
  );
  return unwrap(data.cartLinesRemove, "cartLinesRemove");
}

// ---------- Variant lookup ----------

type VariantInfo = { id: string; availableForSale: boolean };
let variantCache: {
  bySku: Map<string, VariantInfo>;
  expiresAt: number;
} | null = null;

/**
 * Variant GID for a SKU from data/options.ts (e.g. PAL-GP-KEY-DOG). The product has 22 variants,
 * so one query fetches them all; the result is cached in memory for a few minutes.
 */
export async function getVariantBySku(
  sku: string,
): Promise<VariantInfo | null> {
  if (!variantCache || Date.now() > variantCache.expiresAt) {
    const data = await storefrontQuery<{
      product: {
        variants: {
          nodes: {
            id: string;
            sku: string | null;
            availableForSale: boolean;
          }[];
        };
      } | null;
    }>(
      `query ProductVariants($handle: String!) ${IN_CONTEXT} {
        product(handle: $handle) { variants(first: 100) { nodes { id sku availableForSale } } }
      }`,
      { handle: SHOPIFY_PRODUCT_HANDLE },
    );
    console.info("[Shopify product lookup]", {
      handle: SHOPIFY_PRODUCT_HANDLE,
      productFound: Boolean(data.product),
    });
    if (!data.product) {
      throw new ShopifyError(
        `Product "${SHOPIFY_PRODUCT_HANDLE}" not found. Is it published to the headless sales channel?`,
      );
    }
    const bySku = new Map<string, VariantInfo>();
    for (const variant of data.product.variants.nodes) {
      if (variant.sku)
        bySku.set(variant.sku, {
          id: variant.id,
          availableForSale: variant.availableForSale,
        });
    }
    variantCache = { bySku, expiresAt: Date.now() + VARIANT_CACHE_TTL_MS };
  }
  console.info("[Shopify SKU lookup]", {
    requestedSku: sku,
    matchedVariant: variantCache.bySku.get(sku) ?? null,
    cachedSkus: [...variantCache.bySku.keys()],
  });
  return variantCache.bySku.get(sku) ?? null;
}

/** All SKUs Shopify returned for the product, for logging when a lookup misses. */
export function knownSkus() {
  return variantCache ? [...variantCache.bySku.keys()] : [];
}
