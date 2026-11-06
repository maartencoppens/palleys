"use client";

import NextLink from "next/link";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { DEFAULT_LOCALE, localizedPath, type Locale } from "./config";
import type { ClientMessages } from "./messages";

const LocaleContext = createContext<{ locale: Locale; messages: ClientMessages | null }>({
  locale: DEFAULT_LOCALE,
  messages: null,
});

export function LocaleProvider({ locale, messages, children }: { locale: Locale; messages: ClientMessages; children: ReactNode }) {
  return <LocaleContext.Provider value={{ locale, messages }}>{children}</LocaleContext.Provider>;
}

/** Outside the shop (the backoffice) this is the default language. */
export const useLocale = () => useContext(LocaleContext).locale;

export function useMessages() {
  const { messages } = useContext(LocaleContext);
  if (!messages) throw new Error("useMessages needs a LocaleProvider: this component belongs in the shop");
  return messages;
}

/** next/link that stays in the current language. */
export function Link({ href, ...props }: Omit<ComponentProps<typeof NextLink>, "href"> & { href: string }) {
  return <NextLink href={localizedPath(href, useLocale())} {...props} />;
}
