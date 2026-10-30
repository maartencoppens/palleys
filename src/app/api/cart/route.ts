import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import {
  addToCartSchema,
  removeFromCartSchema,
  updateCartLineSchema,
  type CartView,
} from "@/core/modules/shopify/types";
import {
  addPreviewToCart,
  CartError,
  getCart,
  removeFromCart,
  updateCartLineQuantity,
  type CartErrorCode,
} from "@/core/modules/shopify/service";
import { getClientIp } from "@/core/utils/request";
import { CART_COOKIE, CART_COOKIE_MAX_AGE_SECONDS } from "@/data/shopify";

const CART_ERROR_STATUS: Record<CartErrorCode, number> = {
  preview_not_found: 404,
  preview_not_orderable: 409,
  photos_missing: 409,
  variant_unavailable: 409,
};

async function context(request: Request) {
  const cookieStore = await cookies();
  return {
    cartId: cookieStore.get(CART_COOKIE)?.value ?? null,
    buyerIp: getClientIp(request.headers),
  };
}

// The cookie follows the cart: set when there is one, cleared when Shopify no longer knows it.
async function respond(cart: CartView | null, status = 200) {
  const cookieStore = await cookies();
  if (cart) {
    cookieStore.set(CART_COOKIE, cart.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CART_COOKIE_MAX_AGE_SECONDS,
    });
  } else {
    cookieStore.delete(CART_COOKIE);
  }
  return NextResponse.json({ cart }, { status });
}

function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (error instanceof CartError) {
    return NextResponse.json({ error: error.code }, { status: CART_ERROR_STATUS[error.code] });
  }
  console.error("Cart request failed:", error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    return respond(await getCart(await context(request)));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = addToCartSchema.parse(await request.json());
    return respond(await addPreviewToCart(await context(request), input), 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const input = updateCartLineSchema.parse(await request.json());
    return respond(await updateCartLineQuantity(await context(request), input));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const input = removeFromCartSchema.parse(await request.json());
    return respond(await removeFromCart(await context(request), input));
  } catch (error) {
    return handleError(error);
  }
}
