import "server-only";
import Stripe from "stripe";
import { prisma } from "@/db/client";
import {
  describeStripeError,
  isStripeConfigured,
  paymentMethodConfigId,
  stripe,
  StripeNotConfiguredError,
} from "@/core/networking/external/stripe-client";
import { FALLBACK_CHECKOUT_METHODS, PAYMENT_METHODS_CACHE_MS, PAYMENT_METHOD_LABELS } from "@/data/payment-methods";
import { fakePaymentsEnabled } from "./providers/fake";
import { activeCheckoutMethods, checkToggle, readMethodStates, type PaymentMethodOverview, type ToggleRequest } from "./method-rules";

/*
 * The payment methods Stripe Checkout offers, read from and written to Stripe's payment method configuration
 * (STRIPE_PAYMENT_METHOD_CONFIG). Stripe is the only source of truth: on/off is never stored here, so the two can't
 * drift apart. Every change is logged in AdminAuditLog. Test and live mode each have their own configuration.
 */

export const PAYMENT_METHOD_AUDIT_ACTION = "payment_method.toggle";

export class PaymentMethodConfigError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 409 | 502 | 503,
  ) {
    super(message);
  }
}

/** A Stripe failure as something an admin can act on. Never the key or the request. */
function toConfigError(error: unknown, action: "lezen" | "wijzigen"): PaymentMethodConfigError {
  if (error instanceof PaymentMethodConfigError) return error;
  if (error instanceof StripeNotConfiguredError) {
    return new PaymentMethodConfigError("Stripe is niet gekoppeld: zet STRIPE_SECRET en STRIPE_PAYMENT_METHOD_CONFIG in .env", 503);
  }
  const detail = describeStripeError(error);
  console.error(`[payment-methods] Stripe ${action} failed: ${detail.type} ${detail.code ?? ""} (${detail.status ?? "no response"})`);
  if (error instanceof Stripe.errors.StripePermissionError || detail.status === 403) {
    return new PaymentMethodConfigError(
      `De Stripe-sleutel mag de betaalmethodes niet ${action}. Geef hem het recht "Payment method configurations: ${action === "lezen" ? "Read" : "Write"}" of gebruik de secret key.`,
      502,
    );
  }
  if (error instanceof Stripe.errors.StripeAuthenticationError || detail.status === 401) {
    return new PaymentMethodConfigError("Stripe weigert de sleutel (STRIPE_SECRET). Kijk hem na in .env.", 502);
  }
  if (detail.status === 404) {
    return new PaymentMethodConfigError(
      "Stripe kent deze configuratie niet. Kijk STRIPE_PAYMENT_METHOD_CONFIG na: test- en live-modus hebben elk hun eigen pmc_.",
      502,
    );
  }
  if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    return new PaymentMethodConfigError(`Stripe weigerde de wijziging: ${detail.message}`, 502);
  }
  return new PaymentMethodConfigError(`Stripe kon niet bereikt worden om de betaalmethodes te ${action}. Probeer het zo opnieuw.`, 502);
}

async function retrieveConfig() {
  return stripe().paymentMethodConfigurations.retrieve(paymentMethodConfigId());
}

function overviewOf(config: Stripe.PaymentMethodConfiguration): PaymentMethodOverview {
  return {
    mode: config.livemode ? "live" : "test",
    configName: config.name ?? null,
    methods: readMethodStates(config as unknown as Record<string, unknown>),
  };
}

export async function getPaymentMethodOverview(): Promise<PaymentMethodOverview> {
  try {
    return overviewOf(await retrieveConfig());
  } catch (error) {
    throw toConfigError(error, "lezen");
  }
}

/** Turns one method on or off at Stripe, after checking the rules against Stripe's current state. Logged. */
export async function setPaymentMethod(request: ToggleRequest, adminName: string): Promise<PaymentMethodOverview> {
  let current: Stripe.PaymentMethodConfiguration;
  try {
    current = await retrieveConfig();
  } catch (error) {
    throw toConfigError(error, "lezen");
  }
  const check = checkToggle(readMethodStates(current as unknown as Record<string, unknown>), request);
  if (!check.ok) throw new PaymentMethodConfigError(check.error, check.status);

  let updated: Stripe.PaymentMethodConfiguration;
  try {
    // Built as a plain record: methods the SDK's types don't know yet (wero) go through the same way.
    const params = { [request.method]: { display_preference: { preference: check.to } } };
    updated = await stripe().paymentMethodConfigurations.update(
      paymentMethodConfigId(),
      params as Stripe.PaymentMethodConfigurationUpdateParams,
    );
  } catch (error) {
    throw toConfigError(error, "wijzigen");
  }

  await prisma.adminAuditLog.create({
    data: {
      actor: adminName,
      action: PAYMENT_METHOD_AUDIT_ACTION,
      subject: `${request.method} (${updated.livemode ? "live" : "test"})`,
      fromValue: check.from,
      toValue: check.to,
    },
  });
  console.info(`[payment-methods] ${adminName}: ${request.method} ${check.from} → ${check.to} (${updated.livemode ? "live" : "test"})`);
  activeMethodsCache = null;
  return overviewOf(updated);
}

/** The latest changes, for the admin page. */
export async function recentPaymentMethodChanges(take = 10) {
  return prisma.adminAuditLog.findMany({
    where: { action: PAYMENT_METHOD_AUDIT_ACTION },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, actor: true, subject: true, fromValue: true, toValue: true, createdAt: true },
  });
}

let activeMethodsCache: { methods: string[]; at: number } | null = null;

/**
 * The methods the customer can use right now, for checkout texts. Cached for a minute (cleared by an admin change);
 * when Stripe can't be asked, "Bancontact". Never throws: the checkout must never fail on a text.
 */
export async function getActiveCheckoutMethods(): Promise<string[]> {
  if (fakePaymentsEnabled || !isStripeConfigured()) return [...FALLBACK_CHECKOUT_METHODS];
  if (activeMethodsCache && Date.now() - activeMethodsCache.at < PAYMENT_METHODS_CACHE_MS) return activeMethodsCache.methods;
  try {
    const methods = activeCheckoutMethods(readMethodStates((await retrieveConfig()) as unknown as Record<string, unknown>));
    const result = methods.length > 0 ? methods : [...FALLBACK_CHECKOUT_METHODS];
    activeMethodsCache = { methods: result, at: Date.now() };
    return result;
  } catch (error) {
    const detail = describeStripeError(error);
    console.warn(`[payment-methods] using fallback: ${detail.type} (${detail.status ?? "no response"})`);
    // Remember the fallback briefly too, so an outage doesn't mean a Stripe call per page view.
    activeMethodsCache = { methods: [...FALLBACK_CHECKOUT_METHODS], at: Date.now() };
    return activeMethodsCache.methods;
  }
}

export const paymentMethodLabel = (method: string) => PAYMENT_METHOD_LABELS[method] ?? method;
