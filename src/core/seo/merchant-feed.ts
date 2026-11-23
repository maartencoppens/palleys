import { localizedPath, type Locale } from "@/core/locale/config";
import { fill } from "@/core/locale/fill";
import { MESSAGES } from "@/core/locale/messages";
import { editionPriceCents } from "@/core/modules/catalog/utils";
import type { CollectibleView } from "@/core/modules/collectibles/types";
import type { ShopSettings } from "@/core/modules/settings/types";
import { formatPrice } from "@/core/utils/format";
import { editions } from "@/data/options";

/*
 * The product feed Google Merchant Center fetches (scheduled fetch of /feeds/google-merchant.xml): every published
 * collectible, plus one item for the Palley op maat. RSS 2.0 with Google's g: namespace. No server-only imports.
 *
 * Google compares each item with its landing page, so the prices here are the ones the page shows on arrival: a
 * collectible's own price, and for the Palley op maat the edition the configurator preselects (the first on sale).
 */

/** Sent as return_policy_label. In Merchant Center a return policy with this label says "no returns". */
export const PERSONALIZED_RETURN_POLICY_LABEL = "op-maat";
export const PERSONALIZED_ITEM_ID = "palley-op-maat";
const PERSONALIZED_IMAGE = "/images/cta/golden-retriever.jpg";
const BRAND = "Palleys";
const CATEGORY = "Apparel & Accessories > Handbag & Wallet Accessories > Keychains";

export type MerchantFeedInput = {
  locale: Locale;
  /** The site's own address, without a trailing slash. */
  baseUrl: string;
  collectibles: CollectibleView[];
  catalog: Pick<ShopSettings["catalog"], "disabledEditions" | "prices">;
  /** With the checkout closed nothing can be bought, so every item goes out as out of stock. */
  checkoutEnabled: boolean;
};

type FeedItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  image: string;
  priceCents: number;
  inStock: boolean;
  productType: string;
  customLabel: string;
  returnPolicyLabel?: string;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const euro = (cents: number) => `${(cents / 100).toFixed(2)} EUR`;

function itemXml(item: FeedItem) {
  const fields: [string, string | undefined][] = [
    ["g:id", item.id],
    ["g:title", item.title],
    ["g:description", item.description],
    ["g:link", item.link],
    ["g:image_link", item.image],
    ["g:availability", item.inStock ? "in_stock" : "out_of_stock"],
    ["g:price", euro(item.priceCents)],
    ["g:condition", "new"],
    ["g:brand", BRAND],
    ["g:identifier_exists", "no"],
    ["g:google_product_category", CATEGORY],
    ["g:product_type", item.productType],
    ["g:custom_label_0", item.customLabel],
    ["g:return_policy_label", item.returnPolicyLabel],
  ];
  const lines = fields.filter(([, value]) => value).map(([tag, value]) => `      <${tag}>${escapeXml(value!)}</${tag}>`);
  return `    <item>\n${lines.join("\n")}\n    </item>`;
}

/** The feed as XML, in one language. */
export function merchantFeedXml({ locale, baseUrl, collectibles, catalog, checkoutEnabled }: MerchantFeedInput) {
  const { meta } = MESSAGES[locale];
  const absolute = (path: string) => (/^https?:\/\//.test(path) ? path : `${baseUrl}${path === "/" ? "" : path}`);
  const pageUrl = (path: string) => absolute(localizedPath(path, locale));

  const items: FeedItem[] = [];

  // The edition /create opens on. If every edition is off sale, there is no Palley op maat to buy.
  const firstEdition = editions.find((edition) => !catalog.disabledEditions.includes(edition.value));
  if (firstEdition) {
    items.push({
      id: PERSONALIZED_ITEM_ID,
      title: meta.merchant.personalizedTitle,
      description: meta.create.description,
      link: pageUrl("/create"),
      image: absolute(PERSONALIZED_IMAGE),
      priceCents: editionPriceCents(firstEdition.value, catalog.prices),
      inStock: checkoutEnabled,
      productType: meta.merchant.personalizedType,
      customLabel: "op-maat",
      returnPolicyLabel: PERSONALIZED_RETURN_POLICY_LABEL,
    });
  }

  for (const collectible of collectibles) {
    // The shop only lists collectibles with a photo, and Google refuses items without one.
    if (!collectible.imageUrl) continue;
    const price = formatPrice(collectible.priceCents / 100, locale);
    items.push({
      id: collectible.slug,
      title: fill(meta.merchant.collectibleTitle, { name: collectible.name }),
      description: collectible.description || fill(meta.product.description, { name: collectible.name, price }),
      link: pageUrl(`/shop/${collectible.slug}`),
      image: absolute(collectible.imageUrl),
      priceCents: collectible.priceCents,
      inStock: checkoutEnabled && !collectible.soldOut,
      productType: meta.merchant.collectibleType,
      customLabel: "collectible",
    });
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
    `  <channel>`,
    `    <title>${escapeXml(BRAND)}</title>`,
    `    <link>${escapeXml(pageUrl("/"))}</link>`,
    `    <description>${escapeXml(meta.site.description)}</description>`,
    ...items.map(itemXml),
    `  </channel>`,
    `</rss>`,
    "",
  ].join("\n");
}
