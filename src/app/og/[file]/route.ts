import { notFound } from "next/navigation";
import { hasLocale } from "@/core/locale/config";
import { MESSAGES } from "@/core/locale/messages";
import { siteOgImage } from "@/core/seo/og";

// /og/nl.png and /og/en.png: the preview image of every page without one of its own (core/seo/metadata.ts).
export async function GET(_request: Request, ctx: RouteContext<"/og/[file]">) {
  const { file } = await ctx.params;
  const locale = file.replace(/\.png$/, "");
  if (!file.endsWith(".png") || !hasLocale(locale)) notFound();
  const { tagline, badge } = MESSAGES[locale].meta.og;
  const image = await siteOgImage({ tagline, badge });
  image.headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  return image;
}
