import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/db/client";
import { env } from "@/core/utils/env";
import { CURRENCY } from "@/data/pricing";
import type { PaymentProvider, ProviderPayment } from "./types";

/*
 * A stand-in for Bancontact, to walk through the whole order flow locally without a contract: PAYMENT_PROVIDER=fake.
 * The rest of the app can't tell the difference. Its "hosted page" is /dev/test-betaling, and the payment's row in our
 * own database plays the part of Bancontact's records. It can never run in production: `next build` and `next start`
 * set NODE_ENV=production, and then this is off whatever the .env says.
 */

export const FAKE_CHECKOUT_PATH = "/dev/test-betaling";

export const fakePaymentsEnabled = process.env.NODE_ENV !== "production" && env.PAYMENT_PROVIDER === "fake";

const PAYMENT_ID = /^fake[a-f0-9]{24}$/;

export const fakeProvider: PaymentProvider = {
  name: "fake",
  isConfigured: () => fakePaymentsEnabled,
  mode: () => (fakePaymentsEnabled ? "test" : null),
  async createPayment(input) {
    const id = `fake${randomBytes(12).toString("hex")}`;
    const checkoutUrl = new URL(FAKE_CHECKOUT_PATH, env.APP_URL);
    checkoutUrl.searchParams.set("payment", id);
    checkoutUrl.searchParams.set("amount", String(input.amountCents));
    checkoutUrl.searchParams.set("reference", input.reference);
    checkoutUrl.searchParams.set("return", input.returnUrl);
    return {
      id,
      status: "OPEN",
      mode: "test",
      method: "bancontact",
      amountCents: input.amountCents,
      currency: CURRENCY,
      refundedCents: 0,
      chargedBackCents: 0,
      reference: input.reference,
      checkoutUrl: checkoutUrl.toString(),
      snapshot: { paymentId: id, fake: true },
    };
  },
  async getPayment(paymentId) {
    const payment = await prisma.payment.findUniqueOrThrow({
      where: { providerPaymentId: paymentId },
      select: { status: true, amountCents: true, checkoutUrl: true, order: { select: { number: true } } },
    });
    const found: ProviderPayment = {
      id: paymentId,
      status: payment.status,
      mode: "test",
      method: "bancontact",
      amountCents: payment.amountCents,
      currency: CURRENCY,
      refundedCents: 0,
      chargedBackCents: 0,
      reference: payment.order.number,
      checkoutUrl: payment.checkoutUrl,
      snapshot: { paymentId, status: payment.status, fake: true },
    };
    return found;
  },
  async parseCallback() {
    return { ok: false, reason: "the fake provider sends no callbacks" };
  },
  isCheckoutUrl: (url) => url.startsWith(new URL(FAKE_CHECKOUT_PATH, env.APP_URL).toString()),
  isPaymentId: (id) => PAYMENT_ID.test(id),
};
