import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  addCollectibleToCartSchema,
  addToCartSchema,
  removeFromCartSchema,
  updateCartLineSchema,
} from "@/core/modules/cart/types";
import {
  addCollectibleToCart,
  addPreviewToCart,
  CartError,
  getCart,
  removeFromCart,
  updateCartLineQuantity,
  type CartErrorCode,
} from "@/core/modules/cart/service";
import { clearCartToken, readCartToken, writeCartToken } from "@/core/modules/cart/cookie";
import { assertRateLimit, RateLimitError } from "@/core/utils/rate-limit";
import { assertSameOrigin, CrossOriginError } from "@/core/utils/request";

const CART_ERROR_STATUS: Record<CartErrorCode, number> = {
  preview_not_found: 404,
  preview_not_orderable: 409,
  option_unavailable: 409,
  collectible_unavailable: 409,
  photos_missing: 409,
  line_not_found: 404,
  cart_full: 409,
};

function handleError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  if (error instanceof CartError) {
    return NextResponse.json({ error: error.code }, { status: CART_ERROR_STATUS[error.code] });
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
    );
  }
  if (error instanceof CrossOriginError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  console.error("Cart request failed:", error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

async function guard(request: Request) {
  assertSameOrigin(request);
  await assertRateLimit("cart", request.headers);
}

export async function GET() {
  try {
    const cart = await getCart(await readCartToken());
    if (!cart) await clearCartToken();
    return NextResponse.json({ cart });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await guard(request);
    const body = await request.json().catch(() => null);
    const cartToken = await readCartToken();
    const { cart, token } = body?.collectibleId
      ? await addCollectibleToCart(cartToken, addCollectibleToCartSchema.parse(body))
      : await addPreviewToCart(cartToken, addToCartSchema.parse(body));
    await writeCartToken(token);
    return NextResponse.json({ cart }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await guard(request);
    const input = updateCartLineSchema.parse(await request.json().catch(() => null));
    return NextResponse.json({ cart: await updateCartLineQuantity(await readCartToken(), input) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await guard(request);
    const input = removeFromCartSchema.parse(await request.json().catch(() => null));
    return NextResponse.json({ cart: await removeFromCart(await readCartToken(), input) });
  } catch (error) {
    return handleError(error);
  }
}
