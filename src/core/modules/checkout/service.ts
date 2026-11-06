import "server-only";
import { prisma } from "@/db/client";
import { createToken, hashToken } from "@/core/utils/tokens";
import { computeTotals } from "@/core/modules/catalog/utils";
import { assertPreviewCanBeOrdered, CartError, findCartId, getCheckoutLines } from "@/core/modules/cart/service";
import { checkDiscount, claimDiscount } from "@/core/modules/discounts/service";
import type { AppliedDiscount } from "@/core/modules/discounts/types";
import { nextOrderNumber } from "@/core/modules/orders/service";
import { maskEmail } from "@/core/modules/orders/utils";
import { paymentProvider } from "@/core/modules/payments/providers";
import {
  completeFreeOrder,
  createOrderPayment,
  InvalidProviderPaymentError,
  orderReturnUrl,
} from "@/core/modules/payments/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { friendsDelivery, getDeliveryOptions, resolveDeliveryOption } from "@/core/modules/shipping/service";
import type { DeliveryAddress } from "@/core/modules/shipping/types";
import { TERMS_VERSION } from "@/data/checkout";
import { FRIENDS_DELIVERY, needsShippingAddress } from "@/data/shipping";
import { CURRENCY } from "@/data/pricing";
import type { CheckoutConfig, CheckoutInput, CheckoutResult, DeliveryOptionView } from "./types";

/*
 * Checkout: cart → order (PENDING_PAYMENT) → Bancontact Pro payment → hosted checkout URL.
 * Everything that costs money is decided here, from the cart cookie and src/data: the client only supplies the
 * customer's details, a delivery option id and the terms checkbox. The order is only ever marked paid by
 * payments/service.ts after asking Bancontact itself (callback or return page), never because of the redirect.
 */

export type CheckoutErrorCode =
  | "checkout_closed"
  | "payments_unavailable"
  | "cart_empty"
  | "preview_not_orderable"
  | "delivery_option_invalid"
  | "address_required"
  | "discount_invalid"
  | "discount_min_subtotal"
  | "payment_failed";

export class CheckoutError extends Error {
  constructor(
    public readonly code: CheckoutErrorCode,
    public readonly details?: Record<string, number>,
  ) {
    super(code);
  }
}

export async function getCheckoutConfig(): Promise<CheckoutConfig> {
  const settings = await getShopSettings();
  return {
    enabled: settings.checkoutEnabled,
    closedMessage: settings.checkoutEnabled ? null : settings.checkoutClosedMessage,
    paymentsAvailable: paymentProvider.isConfigured(),
  };
}

// The carrier identifier and provider name stay on the server.
const forDisplay = (option: Awaited<ReturnType<typeof getDeliveryOptions>>[number]): DeliveryOptionView => ({
  id: option.id,
  carrier: option.carrier,
  deliveryType: option.deliveryType,
  label: option.label,
  eta: option.eta,
  priceCents: option.priceCents,
});

export async function listDeliveryOptions(cartToken: string | null, address: DeliveryAddress, discountCode?: string) {
  const lines = await getCheckoutLines(cartToken);
  const options = await getDeliveryOptions(address, lines.length > 0 ? lines : [{ size: "M", quantity: 1 }]);
  const check = discountCode ? await checkDiscount(discountCode, subtotalOf(lines)) : null;
  return (check?.ok && check.personalDelivery ? [...options, friendsDelivery()] : options).map(forDisplay);
}

const subtotalOf = (lines: { unitCents: number; quantity: number }[]) =>
  lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);

type DiscountCheck = Awaited<ReturnType<typeof checkDiscount>>;

function assertDiscountUsable(check: DiscountCheck): asserts check is Extract<DiscountCheck, { ok: true }> {
  if (check.ok) return;
  if (check.reason === "min_subtotal") {
    throw new CheckoutError("discount_min_subtotal", { minSubtotalCents: check.minSubtotalCents });
  }
  throw new CheckoutError("discount_invalid");
}

/** What a code takes off this visitor's cart right now, for the checkout's summary. */
export async function applyCheckoutDiscount(cartToken: string | null, code: string): Promise<AppliedDiscount> {
  const lines = await getCheckoutLines(cartToken);
  if (lines.length === 0) throw new CheckoutError("cart_empty");
  const check = await checkDiscount(code, subtotalOf(lines));
  assertDiscountUsable(check);
  return { code: check.code, label: check.label, discountCents: check.discountCents };
}

export async function startCheckout(cartToken: string | null, input: CheckoutInput): Promise<CheckoutResult> {
  const config = await getCheckoutConfig();
  if (!config.enabled) throw new CheckoutError("checkout_closed");
  if (!config.paymentsAvailable) throw new CheckoutError("payments_unavailable");

  const lines = await getCheckoutLines(cartToken);
  if (lines.length === 0) throw new CheckoutError("cart_empty");
  // Same checks as adding to the cart, again: a preview may have expired or been paid in the meantime.
  try {
    await Promise.all(lines.flatMap((line) => (line.previewId ? assertPreviewCanBeOrdered(line.previewId) : [])));
  } catch (error) {
    if (error instanceof CartError) throw new CheckoutError("preview_not_orderable");
    throw error;
  }

  const address = { country: input.country, postalCode: input.postalCode };
  const forFriends = input.deliveryOptionId === FRIENDS_DELIVERY.id;
  const delivery = forFriends ? friendsDelivery() : await resolveDeliveryOption(input.deliveryOptionId, address, lines);
  if (!delivery) throw new CheckoutError("delivery_option_invalid");
  const shipped = needsShippingAddress(delivery.deliveryType);
  if (shipped && !(input.street && input.houseNumber && input.postalCode && input.city)) throw new CheckoutError("address_required");

  const statusToken = createToken();
  const cartId = await findCartId(cartToken);

  const order = await prisma.$transaction(async (tx) => {
    // Checked here rather than once more up front: this is what stops two checkouts sharing the last use of a code.
    let discount: Extract<DiscountCheck, { ok: true }> | null = null;
    if (input.discountCode) {
      const check = await claimDiscount(tx, input.discountCode, subtotalOf(lines), input.email);
      assertDiscountUsable(check);
      discount = check;
    }
    // Free delivery in person is what the code gives: without one that may, this option doesn't exist.
    if (forFriends && !discount?.personalDelivery) throw new CheckoutError("delivery_option_invalid");
    const totals = computeTotals(lines, delivery.priceCents, discount?.discountCents ?? 0);
    const number = await nextOrderNumber(tx);
    return tx.order.create({
      data: {
        number,
        cartId,
        discountCodeId: discount?.id,
        discountCode: discount?.code,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        street: shipped ? input.street : null,
        houseNumber: shipped ? input.houseNumber : null,
        postalCode: shipped ? input.postalCode : null,
        city: shipped ? input.city : null,
        country: input.country,
        currency: CURRENCY,
        ...totals,
        termsVersion: TERMS_VERSION,
        termsAcceptedAt: new Date(),
        locale: input.locale,
        marketingOptIn: input.marketingOptIn,
        statusTokenHash: hashToken(statusToken),
        items: {
          create: lines.map((line) => ({
            previewId: line.previewId,
            collectibleId: line.collectibleId,
            sku: line.sku,
            size: line.size,
            edition: line.edition,
            attachment: line.attachment,
            animal: line.animal,
            title: line.title,
            notes: line.notes,
            quantity: line.quantity,
            unitCents: line.unitCents,
            // Made from the customer's photo: no right of withdrawal (art. VI.53, 3° WER). A collectible has one.
            withdrawable: line.kind === "collectible",
          })),
        },
        shipment: {
          create: {
            provider: delivery.provider,
            deliveryOptionId: delivery.id,
            deliveryType: delivery.deliveryType,
            carrier: delivery.carrier,
            label: delivery.label,
            priceCents: delivery.priceCents,
            checkoutIdentifier: delivery.checkoutIdentifier,
          },
        },
        statusChanges: { create: { fromStatus: null, toStatus: "PENDING_PAYMENT", source: "checkout" } },
      },
      select: { id: true, number: true, totalCents: true, locale: true },
    });
  });

  // Nothing to pay (a 100% code with free delivery): Bancontact can't charge € 0, so there's no payment to wait for.
  if (order.totalCents === 0) {
    await completeFreeOrder(order.id, order.number);
    return { checkoutUrl: orderReturnUrl(order.id, statusToken, order.locale) };
  }

  let payment: Awaited<ReturnType<typeof createOrderPayment>>;
  try {
    payment = await createOrderPayment(order, statusToken);
  } catch (error) {
    console.error(
      `[checkout] payment creation failed for ${order.number} (${maskEmail(input.email)}):`,
      error instanceof Error ? error.message : error,
    );
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        attentionReason: error instanceof InvalidProviderPaymentError ? `Betaling ${error.paymentId} aangemaakt maar ongeldig` : null,
        statusChanges: {
          create: { fromStatus: "PENDING_PAYMENT", toStatus: "CANCELLED", source: "checkout", note: "Payment creation failed" },
        },
      },
    });
    throw new CheckoutError("payment_failed");
  }

  console.info(`[checkout] ${order.number} created, payment ${payment.id} (${payment.mode})`);
  return { checkoutUrl: payment.checkoutUrl };
}
