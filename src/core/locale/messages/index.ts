import type { Locale } from "../config";
import { en } from "./en";
import { nl, type Messages } from "./nl";

export type { Messages };

export const MESSAGES: Record<Locale, Messages> = { nl, en };

// What the browser needs: everything else is only read on the server and stays out of every page.
const CLIENT_NAMESPACES = ["common", "nav", "options", "shop", "contact", "create", "cart", "checkout", "shipping", "orderReturn"] as const;

export type ClientMessages = Pick<Messages, (typeof CLIENT_NAMESPACES)[number]>;

export function clientMessages(locale: Locale) {
  return Object.fromEntries(CLIENT_NAMESPACES.map((name) => [name, MESSAGES[locale][name]])) as ClientMessages;
}
