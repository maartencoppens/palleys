import "server-only";
import { bancontactProvider } from "./bancontact";
import type { PaymentProvider } from "./types";

// The provider every payment goes through: Bancontact Pro (contract via KBC).
export const paymentProvider: PaymentProvider = bancontactProvider;
