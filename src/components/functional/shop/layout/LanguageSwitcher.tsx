"use client";

import { usePathname } from "next/navigation";
import { useLocale, useMessages } from "@/core/locale/client";
import { LOCALE_LABELS, LOCALES, localizedPath, stripLocale } from "@/core/locale/config";

/*
 * NL | EN in the navbar. Plain links, so they also work without JavaScript and search engines can follow them. Clicking
 * loads the same page in the other language, with its query kept (the order page needs it). The cart lives in a cookie
 * and stays. stripLocale makes server and browser agree, because the proxy shows the server /nl/create for /create.
 */
export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const current = useLocale();
  const { nav } = useMessages();

  return (
    <ul
      aria-label={nav.language}
      className={`flex items-center rounded-pill border-[1.5px] border-off-white/40 p-0.5 font-label text-xs leading-none font-bold text-off-white md:text-sm ${className}`}
    >
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <li key={locale}>
            <a
              href={localizedPath(stripLocale(pathname), locale)}
              hrefLang={locale}
              lang={locale}
              title={LOCALE_LABELS[locale].name}
              aria-current={active ? "true" : undefined}
              onClick={(event) => {
                event.currentTarget.href += window.location.search + window.location.hash;
              }}
              className={`block rounded-pill px-2 py-1.5 transition-colors md:px-2.5 ${
                active ? "bg-off-white text-medium-green" : "hover:bg-off-white/15"
              }`}
            >
              <span aria-hidden>{LOCALE_LABELS[locale].short}</span>
              <span className="sr-only">{LOCALE_LABELS[locale].name}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
