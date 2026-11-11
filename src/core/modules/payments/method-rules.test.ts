import { describe, expect, it } from "vitest";
import { activeCheckoutMethods, checkToggle, readMethodStates, toggleRequestSchema } from "./method-rules";

const method = (available: boolean, preference: string, value = preference) => ({
  available,
  display_preference: { overridable: null, preference, value },
});

// Shaped like Stripe's payment method configuration object.
function config(overrides: Record<string, unknown> = {}) {
  return {
    id: "pmc_test_1",
    object: "payment_method_configuration",
    active: true,
    is_default: false,
    livemode: false,
    name: "Palleys",
    parent: null,
    application: null,
    bancontact: method(true, "on"),
    ideal: method(true, "on"),
    wero: method(false, "off"),
    card: method(false, "off"),
    apple_pay: method(false, "off"),
    google_pay: method(false, "off"),
    link: method(false, "off"),
    eps: method(false, "off"),
    klarna: method(false, "off"),
    ...overrides,
  };
}

describe("readMethodStates", () => {
  it("lists every method, allowlisted ones first, and skips non-method keys", () => {
    const states = readMethodStates(config());
    expect(states.map((state) => state.method).slice(0, 7)).toEqual(["bancontact", "ideal", "wero", "card", "apple_pay", "google_pay", "link"]);
    expect(states.find((state) => state.method === "id")).toBeUndefined();
    expect(states.find((state) => state.method === "eps")).toMatchObject({ toggleable: false, card: false });
    expect(states.find((state) => state.method === "card")).toMatchObject({ toggleable: true, card: true });
    expect(states.find((state) => state.method === "ideal")).toMatchObject({ label: "iDEAL | Wero", available: true, value: "on" });
  });

  it("gives the customer side only allowlisted, available methods", () => {
    expect(activeCheckoutMethods(readMethodStates(config({ klarna: method(true, "on") })))).toEqual(["bancontact", "ideal"]);
  });
});

describe("checkToggle", () => {
  const states = readMethodStates(config());

  it("allows turning an allowlisted method on or off", () => {
    expect(checkToggle(states, { method: "wero", enabled: true })).toEqual({ ok: true, from: "off", to: "on" });
    expect(checkToggle(states, { method: "ideal", enabled: false })).toEqual({ ok: true, from: "on", to: "off" });
  });

  it("enforces the allowlist", () => {
    expect(checkToggle(states, { method: "klarna", enabled: true })).toMatchObject({ ok: false, status: 400 });
    expect(checkToggle(states, { method: "eps", enabled: false })).toMatchObject({ ok: false, status: 400 });
    expect(checkToggle(states, { method: "sofort", enabled: true })).toMatchObject({ ok: false, status: 400 });
  });

  it("refuses an allowlisted method this configuration doesn't have", () => {
    const withoutWero = readMethodStates(config({ wero: null }));
    expect(checkToggle(withoutWero, { method: "wero", enabled: true })).toMatchObject({ ok: false, status: 409 });
  });

  it("never turns off the last method that is on", () => {
    const onlyBancontact = readMethodStates(config({ ideal: method(false, "off") }));
    expect(checkToggle(onlyBancontact, { method: "bancontact", enabled: false })).toMatchObject({ ok: false, status: 409 });
  });

  it("counts a non-allowlisted method that is on as still on", () => {
    const withKlarna = readMethodStates(config({ ideal: method(false, "off"), klarna: method(true, "on") }));
    expect(checkToggle(withKlarna, { method: "bancontact", enabled: false })).toMatchObject({ ok: true });
  });

  it("turns card methods on only with the explicit confirmation", () => {
    for (const card of ["card", "apple_pay", "google_pay", "link"]) {
      expect(checkToggle(states, { method: card, enabled: true })).toMatchObject({ ok: false, status: 400 });
      expect(checkToggle(states, { method: card, enabled: true, confirmCardFees: false })).toMatchObject({ ok: false, status: 400 });
      expect(checkToggle(states, { method: card, enabled: true, confirmCardFees: true })).toEqual({ ok: true, from: "off", to: "on" });
    }
  });

  it("turns card methods off without a confirmation", () => {
    const withCard = readMethodStates(config({ card: method(true, "on") }));
    expect(checkToggle(withCard, { method: "card", enabled: false })).toMatchObject({ ok: true, to: "off" });
  });
});

describe("toggleRequestSchema", () => {
  it("accepts a well-formed request and nothing else", () => {
    expect(toggleRequestSchema.safeParse({ method: "ideal", enabled: true }).success).toBe(true);
    expect(toggleRequestSchema.safeParse({ method: "card", enabled: true, confirmCardFees: true }).success).toBe(true);
    for (const bad of [
      null,
      {},
      { method: "ideal" },
      { method: "ideal", enabled: "yes" },
      { method: "IDEAL; drop", enabled: true },
      { method: "ideal", enabled: true, extra: 1 },
      { method: "x".repeat(60), enabled: true },
    ]) {
      expect(toggleRequestSchema.safeParse(bad).success).toBe(false);
    }
  });
});
