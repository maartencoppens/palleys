import "server-only";
import { prisma } from "@/db/client";
import { env } from "@/core/utils/env";
import { createToken, hashToken } from "@/core/utils/tokens";
import { computeTotals } from "@/core/modules/catalog/utils";
import { assertPreviewCanBeOrdered, CartError, getCheckoutLines } from "@/core/modules/cart/service";
import { formatOrderNumber, maskEmail, orderYear } from "@/core/modules/orders/utils";
import { paymentProvider } from "@/core/modules/payments/providers";
import { BANCONTACT_CALLBACK_PATH } from "@/core/modules/payments/providers/bancontact";
import type { ProviderPayment } from "@/core/modules/payments/providers/types";
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

function isPublicHttps(url: string) {
  const { hostname, protocol } = new URL(url);
  const local = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local") || hostname.endsWith(".localhost");
  return protocol === "https:" && !local;
}

// Bancontact can't reach localhost: no callback there, the return page asks Bancontact instead.
function callbackUrl() {
  return isPublicHttps(env.APP_URL) ? `${env.APP_URL}${BANCONTACT_CALLBACK_PATH}` : null;
}

async function nextOrderNumber(tx: Pick<typeof prisma, "$queryRaw">) {
  const year = orderYear();
  // Row-locking upsert inside the order's transaction: concurrent checkouts wait, a rollback leaves no gap.
  const [row] = await tx.$queryRaw<{ last: number }[]>`
    INSERT INTO "OrderCounter" ("year", "last") VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE SET "last" = "OrderCounter"."last" + 1
    RETURNING "last"`;
  return formatOrderNumber(year, row.last);
}

export async function startCheckout(cartToken: string | null, input: CheckoutInput): Promise<CheckoutResult> {
  const config = await getCheckoutConfig();
  if (!config.enabled) throw new CheckoutError("checkout_closed");
  if (!config.paymentsAvailable) throw new CheckoutError("payments_unavailable");

  const lines = await getCheckoutLines(cartToken);
  if (lines.length === 0) throw new CheckoutError("cart_empty");
  // Same checks as adding to the cart, again: a preview may have expired or been paid in the meantime.
  try {
    await Promise.all(lines.map((line) => assertPreviewCanBeOrdered(line.previewId)));
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
            sku: line.sku,
            size: line.size,
            edition: line.edition,
            animal: line.animal,
            title: line.title,
            notes: line.notes,
            quantity: line.quantity,
            unitCents: line.unitCents,
            withdrawable: false, // made from the customer's photo: no right of withdrawal (art. VI.53, 3° WER)
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

  const returnUrl = new URL("/checkout/return", env.APP_URL);
  returnUrl.searchParams.set("order", order.id);
  returnUrl.searchParams.set("t", statusToken);

  let payment: ProviderPayment | undefined;
  let checkoutUrl: string;
  try {
    payment = await paymentProvider.createPayment({
      amountCents: order.totalCents,
      reference: order.number,
      description: `Palleys bestelling ${order.number}`,
      // Bancontact only accepts https here; locally that means `npm run dev:https`.
      returnUrl: returnUrl.toString(),
      callbackUrl: callbackUrl(),
    });
    if (!payment.checkoutUrl || !paymentProvider.isCheckoutUrl(payment.checkoutUrl)) {
      throw new Error(`Unexpected checkout URL for ${payment.id}`);
    }
    if (payment.amountCents !== order.totalCents) {
      throw new Error(`Payment ${payment.id} amount ${payment.amountCents} != order ${order.totalCents}`);
    }
    checkoutUrl = payment.checkoutUrl;
  } catch (error) {
    console.error(
      `[checkout] payment creation failed for ${order.number} (${maskEmail(input.email)}):`,
      error instanceof Error ? error.message : error,
    );
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        attentionReason: payment ? `Betaling ${payment.id} aangemaakt maar ongeldig` : null,
        statusChanges: {
          create: { fromStatus: "PENDING_PAYMENT", toStatus: "CANCELLED", source: "checkout", note: "Payment creation failed" },
        },
      },
    });
    throw new CheckoutError("payment_failed");
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: paymentProvider.name,
      providerPaymentId: payment.id,
      mode: payment.mode,
      method: payment.method,
      status: payment.status,
      amountCents: payment.amountCents,
      checkoutUrl,
      rawLastStatus: payment.snapshot as object,
      // Not synced yet: the return page's first poll asks Bancontact straight away.
    },
  });

  console.info(`[checkout] ${order.number} created, payment ${payment.id} (${payment.mode})`);
  return { checkoutUrl };
}
