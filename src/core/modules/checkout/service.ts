import "server-only";
import { prisma } from "@/db/client";
import { createToken, hashToken } from "@/core/utils/tokens";
import { computeTotals } from "@/core/modules/catalog/utils";
import { assertPreviewCanBeOrdered, CartError, getCheckoutLines } from "@/core/modules/cart/service";
import { nextOrderNumber } from "@/core/modules/orders/service";
import { maskEmail } from "@/core/modules/orders/utils";
import { paymentProvider } from "@/core/modules/payments/providers";
import { createOrderPayment, InvalidProviderPaymentError } from "@/core/modules/payments/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { getDeliveryOptions, resolveDeliveryOption } from "@/core/modules/shipping/service";
import type { DeliveryAddress } from "@/core/modules/shipping/types";
import { TERMS_VERSION } from "@/data/checkout";
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
  | "payment_failed";

export class CheckoutError extends Error {
  constructor(public readonly code: CheckoutErrorCode) {
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

export async function listDeliveryOptions(cartToken: string | null, address: DeliveryAddress) {
  const lines = await getCheckoutLines(cartToken);
  const options = await getDeliveryOptions(address, lines.length > 0 ? lines : [{ size: "M", quantity: 1 }]);
  return options.map(forDisplay);
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
  const delivery = await resolveDeliveryOption(input.deliveryOptionId, address, lines);
  if (!delivery) throw new CheckoutError("delivery_option_invalid");

  const totals = computeTotals(lines, delivery.priceCents);
  const statusToken = createToken();

  const order = await prisma.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx);
    return tx.order.create({
      data: {
        number,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        street: input.street,
        houseNumber: input.houseNumber,
        postalCode: input.postalCode,
        city: input.city,
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
      select: { id: true, number: true, totalCents: true },
    });
  });

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
