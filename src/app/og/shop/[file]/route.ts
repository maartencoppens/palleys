import { notFound } from "next/navigation";
import { hasLocale } from "@/core/locale/config";
import { MESSAGES } from "@/core/locale/messages";
import { getPublishedCollectible, readCollectibleImage } from "@/core/modules/collectibles/service";
import { formatPrice } from "@/core/utils/format";
import { productOgImage } from "@/core/seo/og";

// /og/shop/<slug>.<locale>.png: the preview image of a collectible, with its own photo, name and price.
export async function GET(_request: Request, ctx: RouteContext<"/og/shop/[file]">) {
  const { file } = await ctx.params;
  const match = /^([a-z0-9-]+)\.([a-z]{2})\.png$/.exec(file);
  if (!match || !hasLocale(match[2])) notFound();
  const [, slug, locale] = match;
  const collectible = await getPublishedCollectible(slug, locale);
  if (!collectible) notFound();

  const m = MESSAGES[locale].meta.og;
  const imageFile = collectible.imageUrl?.split("/").pop() ?? null;
  const image = await productOgImage({
    name: collectible.name,
    price: formatPrice(collectible.priceCents / 100, locale),
    badge: m.productBadge,
    line: m.productLine,
    image: imageFile ? await readCollectibleImage(imageFile) : null,
  });
  // Shorter than the site image: the price or photo can change.
  image.headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return image;
}
