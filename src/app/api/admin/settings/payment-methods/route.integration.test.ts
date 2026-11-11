import Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The payment method settings as the admin page calls them: the real admin guard (with the session mocked), the real
 * rules and audit log against the local database, and Stripe's payment method configuration mocked.
 */

process.env.ADMIN_EMAILS = "admin@palleys.test";

const auth = vi.hoisted(() => ({ session: null as null | { user: { name: string; email: string } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/core/modules/auth/auth", () => ({ auth: { api: { getSession: async () => auth.session } } }));

const stripeMock = vi.hoisted(() => ({
  config: {} as Record<string, unknown>,
  updates: [] as Record<string, unknown>[],
  retrieveCalls: 0,
  failUpdate: null as Error | null,
  failRetrieve: null as Error | null,
}));

vi.mock("@/core/networking/external/stripe-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/core/networking/external/stripe-client")>();
  return {
    ...original,
    isStripeConfigured: () => true,
    paymentMethodConfigId: () => "pmc_test_1",
    stripe: () => ({
      paymentMethodConfigurations: {
        async retrieve() {
          stripeMock.retrieveCalls++;
          if (stripeMock.failRetrieve) throw stripeMock.failRetrieve;
          return structuredClone(stripeMock.config);
        },
        async update(_id: string, params: Record<string, { display_preference: { preference: string } }>) {
          if (stripeMock.failUpdate) throw stripeMock.failUpdate;
          stripeMock.updates.push(params);
          for (const [key, value] of Object.entries(params)) {
            const preference = value.display_preference.preference;
            stripeMock.config[key] = { available: preference === "on", display_preference: { overridable: null, preference, value: preference } };
          }
          return structuredClone(stripeMock.config);
        },
      },
    }),
  };
});

const { prisma } = await import("@/db/client");
const { GET, PUT } = await import("./route");
const { getActiveCheckoutMethods } = await import("@/core/modules/payments/method-config");

const ADMIN = { user: { name: "Test Admin", email: "admin@palleys.test" } };
const method = (on: boolean) => ({ available: on, display_preference: { overridable: null, preference: on ? "on" : "off", value: on ? "on" : "off" } });

const put = (body: unknown) =>
  PUT(new Request("http://localhost/api/admin/settings/payment-methods", { method: "PUT", body: JSON.stringify(body) }));

const startedAt = new Date();

beforeEach(() => {
  auth.session = ADMIN;
  stripeMock.updates = [];
  stripeMock.failUpdate = null;
  stripeMock.failRetrieve = null;
  stripeMock.config = {
    id: "pmc_test_1",
    object: "payment_method_configuration",
    livemode: false,
    name: "Palleys",
    bancontact: method(true),
    ideal: method(true),
    wero: method(false),
    card: method(false),
    klarna: method(false),
  };
});

afterAll(async () => {
  await prisma.adminAuditLog.deleteMany({ where: { actor: ADMIN.user.name, createdAt: { gte: startedAt } } });
  await prisma.$disconnect();
});

describe("payment method settings", () => {
  it("only answers logged-in admins", async () => {
    auth.session = null;
    expect((await GET()).status).toBe(401);
    expect((await put({ method: "wero", enabled: true })).status).toBe(401);
    // Logged in, but not (or no longer) on ADMIN_EMAILS.
    auth.session = { user: { name: "Someone", email: "someone@example.com" } };
    expect((await GET()).status).toBe(401);
    expect((await put({ method: "wero", enabled: true })).status).toBe(401);
    expect(stripeMock.updates).toEqual([]);
  });

  it("shows the configuration with test/live mode", async () => {
    const body = await (await GET()).json();
    expect(body.overview).toMatchObject({ mode: "test", configName: "Palleys" });
    expect(body.overview.methods.map((state: { method: string }) => state.method)).toContain("wero");
  });

  it("turns a method on at Stripe and logs who did it", async () => {
    const response = await put({ method: "wero", enabled: true });
    expect(response.status).toBe(200);
    expect(stripeMock.updates).toEqual([{ wero: { display_preference: { preference: "on" } } }]);
    const log = await prisma.adminAuditLog.findFirst({ where: { actor: ADMIN.user.name, subject: "wero (test)" }, orderBy: { createdAt: "desc" } });
    expect(log).toMatchObject({ action: "payment_method.toggle", fromValue: "off", toValue: "on" });
  });

  it("enforces the allowlist and validates input", async () => {
    expect((await put({ method: "klarna", enabled: true })).status).toBe(400);
    expect((await put({ method: "ideal" })).status).toBe(400);
    expect((await put({ method: "ideal", enabled: true, extra: "x" })).status).toBe(400);
    expect(stripeMock.updates).toEqual([]);
  });

  it("refuses to turn off the last method", async () => {
    expect((await put({ method: "ideal", enabled: false })).status).toBe(200);
    const response = await put({ method: "bancontact", enabled: false });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("Minstens één");
    expect(stripeMock.updates).toHaveLength(1);
  });

  it("turns cards on only with the confirmation", async () => {
    expect((await put({ method: "card", enabled: true })).status).toBe(400);
    expect(stripeMock.updates).toEqual([]);
    expect((await put({ method: "card", enabled: true, confirmCardFees: true })).status).toBe(200);
    expect(stripeMock.updates).toEqual([{ card: { display_preference: { preference: "on" } } }]);
  });

  it("shows a failed Stripe update as a clear error, without logging a change", async () => {
    stripeMock.failUpdate = new Stripe.errors.StripePermissionError({
      type: "invalid_request_error",
      message: "The provided key does not have the required permissions",
      statusCode: 403,
    } as never);
    const before = await prisma.adminAuditLog.count({ where: { actor: ADMIN.user.name } });
    const response = await put({ method: "wero", enabled: true });
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain("mag de betaalmethodes niet wijzigen");
    expect(await prisma.adminAuditLog.count({ where: { actor: ADMIN.user.name } })).toBe(before);

    stripeMock.failUpdate = new Error("socket hang up");
    const network = await put({ method: "wero", enabled: true });
    expect(network.status).toBe(502);
    expect((await network.json()).error).toContain("kon niet bereikt worden");
  });

  it("feeds the checkout from Stripe, with a cache an admin change clears and a fallback", async () => {
    // A change clears the cache, so the next read asks Stripe again.
    await put({ method: "wero", enabled: true });
    expect(await getActiveCheckoutMethods()).toEqual(["bancontact", "ideal", "wero"]);
    const calls = stripeMock.retrieveCalls;
    expect(await getActiveCheckoutMethods()).toEqual(["bancontact", "ideal", "wero"]);
    expect(stripeMock.retrieveCalls).toBe(calls);

    await put({ method: "wero", enabled: false });
    stripeMock.failRetrieve = new Error("Stripe down");
    expect(await getActiveCheckoutMethods()).toEqual(["bancontact"]);
  });
});
