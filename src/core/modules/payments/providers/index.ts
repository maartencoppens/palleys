import "server-only";
import { fakePaymentsEnabled, fakeProvider } from "./fake";
import { stripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

// The provider every payment goes through: Stripe hosted Checkout. Locally optionally a stand-in (see fake.ts).
export const paymentProvider: PaymentProvider = fakePaymentsEnabled ? fakeProvider : stripeProvider;
