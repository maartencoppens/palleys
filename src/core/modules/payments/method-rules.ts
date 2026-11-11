import { z } from "zod";
import {
  isCardPaymentMethod,
  isToggleablePaymentMethod,
  PAYMENT_METHOD_LABELS,
  TOGGLEABLE_PAYMENT_METHODS,
} from "@/data/payment-methods";

/*
 * Pure rules for the payment method configuration (no network, no server-only, so they're unit tested): reading
 * Stripe's configuration object into a list, and deciding whether an admin's change is allowed.
 */

export type PaymentMethodState = {
  method: string;
  label: string;
  /** On our allowlist: an admin may turn it on or off here. */
  toggleable: boolean;
  /** Card or wallet: turning it on needs an explicit confirmation (higher fees). */
  card: boolean;
  /** Stripe's `available`: offered at checkout right now (preference on and the capability active on the account). */
  available: boolean;
  /** What we asked for: "on", "off" or "none" (no preference, Stripe's default). */
  preference: string;
  /** What Stripe actually uses: "on" or "off". */
  value: string;
};

export type PaymentMethodOverview = {
  mode: "test" | "live";
  configName: string | null;
  methods: PaymentMethodState[];
};

const NON_METHOD_KEYS = new Set(["id", "object", "active", "application", "is_default", "livemode", "name", "parent"]);

type RawMethod = { available?: unknown; display_preference?: { preference?: unknown; value?: unknown } };

/**
 * Stripe's configuration object → one row per payment method. Read generically (every key with a display_preference),
 * so methods the SDK's types don't know yet (Wero) show up too. Allowlisted ones first, in our order.
 */
export function readMethodStates(config: Record<string, unknown>): PaymentMethodState[] {
  const states: PaymentMethodState[] = [];
  for (const [key, raw] of Object.entries(config)) {
    if (NON_METHOD_KEYS.has(key) || !raw || typeof raw !== "object") continue;
    const method = raw as RawMethod;
    if (!method.display_preference || typeof method.display_preference !== "object") continue;
    states.push({
      method: key,
      label: PAYMENT_METHOD_LABELS[key] ?? key,
      toggleable: isToggleablePaymentMethod(key),
      card: isCardPaymentMethod(key),
      available: method.available === true,
      preference: String(method.display_preference.preference ?? "none"),
      value: String(method.display_preference.value ?? "off"),
    });
  }
  const rank = (state: PaymentMethodState) => {
    const index = (TOGGLEABLE_PAYMENT_METHODS as readonly string[]).indexOf(state.method);
    return index === -1 ? TOGGLEABLE_PAYMENT_METHODS.length : index;
  };
  return states.sort((a, b) => rank(a) - rank(b) || a.method.localeCompare(b.method));
}

/** The allowlisted methods a customer can use right now, in our order. */
export function activeCheckoutMethods(states: PaymentMethodState[]) {
  return states.filter((state) => state.toggleable && state.available).map((state) => state.method);
}

export type ToggleRequest = { method: string; enabled: boolean; confirmCardFees?: boolean };

export type ToggleCheck = { ok: true; from: string; to: "on" | "off" } | { ok: false; status: 400 | 409; error: string };

/** Whether an admin may make this change, given the configuration as Stripe reports it right now. */
export function checkToggle(states: PaymentMethodState[], request: ToggleRequest): ToggleCheck {
  if (!isToggleablePaymentMethod(request.method)) {
    return { ok: false, status: 400, error: "Deze betaalmethode wordt door onze checkout niet ondersteund en kan hier niet aangezet worden" };
  }
  const state = states.find((candidate) => candidate.method === request.method);
  if (!state) {
    return { ok: false, status: 409, error: `${PAYMENT_METHOD_LABELS[request.method] ?? request.method} bestaat niet in deze Stripe-configuratie` };
  }
  const to = request.enabled ? "on" : "off";
  if (state.value === to && state.preference === to) return { ok: true, from: state.preference, to };

  if (request.enabled && state.card && request.confirmCardFees !== true) {
    return { ok: false, status: 400, error: "Kaartbetalingen kosten meer per betaling: bevestig dat je ze toch wilt aanzetten" };
  }
  if (!request.enabled) {
    const othersOn = states.filter((candidate) => candidate.method !== request.method && candidate.value === "on");
    if (othersOn.length === 0) {
      return { ok: false, status: 409, error: "Minstens één betaalmethode moet aan blijven, anders kan niemand nog betalen" };
    }
  }
  return { ok: true, from: state.preference, to };
}

/** What the admin sends. Only the shape is checked here; whether the change is allowed is checkToggle's job. */
export const toggleRequestSchema = z
  .object({
    method: z.string().regex(/^[a-z_]{2,40}$/),
    enabled: z.boolean(),
    confirmCardFees: z.boolean().optional(),
  })
  .strict();
