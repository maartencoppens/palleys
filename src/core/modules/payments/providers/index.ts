import "server-only";
import { bancontactProvider } from "./bancontact";
import { fakePaymentsEnabled, fakeProvider } from "./fake";
import type { PaymentProvider } from "./types";

// The provider every payment goes through: Bancontact Pro (contract via KBC). Locally optionally a stand-in (see fake.ts).
export const paymentProvider: PaymentProvider = fakePaymentsEnabled ? fakeProvider : bancontactProvider;
