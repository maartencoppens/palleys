import type { MetadataRoute } from "next";
import { MESSAGES } from "@/core/locale/messages";
import { DEFAULT_LOCALE } from "@/core/locale/config";
import { BACKGROUND_COLOR, THEME_COLOR } from "@/data/seo";

// "Add to home screen" and the icon search engines and phones show for the site.
export default function manifest(): MetadataRoute.Manifest {
  const meta = MESSAGES[DEFAULT_LOCALE].meta;
  return {
    name: meta.site.title,
    short_name: meta.siteName,
    description: meta.site.description,
    lang: DEFAULT_LOCALE,
    start_url: "/",
    display: "standalone",
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
