// Search and social sharing. No server-only imports: the Open Graph images and the metadata both use these.
import type { Locale } from "@/core/locale/config";

// How Facebook, WhatsApp and LinkedIn expect a preview image; X crops it to 2:1.
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

// Open Graph wants language_TERRITORY. We sell in Belgium; English visitors get the British spelling we write in.
export const OG_LOCALES: Record<Locale, string> = { nl: "nl_BE", en: "en_GB" };

// The branded preview images, made by app/og. A path with an extension, so the language routing leaves it alone.
export const ogImagePath = (locale: Locale) => `/og/${locale}.png`;
export const productOgImagePath = (slug: string, locale: Locale) => `/og/shop/${slug}.${locale}.png`;

// Browser and home-screen colours: the hero green, and the page background for the splash screen.
export const THEME_COLOR = "#075847";
export const BACKGROUND_COLOR = "#ebe9df";
