import { describe, expect, it } from "vitest";
import type { CollectibleView } from "@/core/modules/collectibles/types";
import { merchantFeedXml, PERSONALIZED_ITEM_ID, type MerchantFeedInput } from "./merchant-feed";

const collectible = (overrides: Partial<CollectibleView> = {}): CollectibleView => ({
  id: "c1",
  slug: "kat-milo",
  name: "Milo",
  description: "Een kat met attitude",
  tag: null,
  priceCents: 2399,
  imageUrl: "/api/collectibles/images/milo.webp",
  soldOut: false,
  stock: null,
  ...overrides,
});

const input = (overrides: Partial<MerchantFeedInput> = {}): MerchantFeedInput => ({
  locale: "nl",
  baseUrl: "https://palleys.test",
  collectibles: [collectible()],
  catalog: { disabledEditions: [], prices: { keychain: 2799, figurine: 2499 } },
  checkoutEnabled: true,
  ...overrides,
});

/** The items as a map of id → their g: fields. */
function items(xml: string) {
  return Object.fromEntries(
    [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => {
      const fields = Object.fromEntries([...body.matchAll(/<g:(\w+)>([^<]*)<\/g:\1>/g)].map(([, tag, value]) => [tag, value]));
      return [fields.id, fields];
    }),
  );
}

describe("merchantFeedXml", () => {
  it("lists the Palley op maat at the price of the edition /create opens on, without returns", () => {
    const item = items(merchantFeedXml(input()))[PERSONALIZED_ITEM_ID];
    expect(item.price).toBe("27.99 EUR");
    expect(item.link).toBe("https://palleys.test/create");
    expect(item.image_link).toBe("https://palleys.test/images/cta/golden-retriever.jpg");
    expect(item.availability).toBe("in_stock");
    expect(item.return_policy_label).toBe("op-maat");
  });

  it("follows the configurator when the keychain is off sale, and drops the item when nothing is on sale", () => {
    const figurineOnly = items(merchantFeedXml(input({ catalog: { disabledEditions: ["keychain"], prices: { keychain: 2799, figurine: 2499 } } })));
    expect(figurineOnly[PERSONALIZED_ITEM_ID].price).toBe("24.99 EUR");
    const none = items(merchantFeedXml(input({ catalog: { disabledEditions: ["keychain", "figure"], prices: { keychain: 2799, figurine: 2499 } } })));
    expect(none[PERSONALIZED_ITEM_ID]).toBeUndefined();
  });

  it("lists each collectible with its own page, photo, price and stock", () => {
    const feed = items(merchantFeedXml(input({ collectibles: [collectible(), collectible({ slug: "hond-rex", name: "Rex", soldOut: true })] })));
    expect(feed["kat-milo"]).toMatchObject({
      title: "Milo: 3D-geprinte dierensleutelhanger",
      link: "https://palleys.test/shop/kat-milo",
      image_link: "https://palleys.test/api/collectibles/images/milo.webp",
      price: "23.99 EUR",
      availability: "in_stock",
    });
    expect(feed["kat-milo"].return_policy_label).toBeUndefined();
    expect(feed["hond-rex"].availability).toBe("out_of_stock");
  });

  it("uses the language's links and texts", () => {
    const feed = items(merchantFeedXml(input({ locale: "en", collectibles: [collectible({ description: null })] })));
    expect(feed[PERSONALIZED_ITEM_ID].link).toBe("https://palleys.test/en/create");
    expect(feed["kat-milo"].link).toBe("https://palleys.test/en/shop/kat-milo");
    expect(feed["kat-milo"].description).toContain("Milo from the Palleys collection");
  });

  it("marks everything out of stock while the checkout is closed", () => {
    const feed = items(merchantFeedXml(input({ checkoutEnabled: false })));
    expect(Object.values(feed).map((item) => item.availability)).toEqual(["out_of_stock", "out_of_stock"]);
  });

  it("escapes text so a name can't break the XML", () => {
    const xml = merchantFeedXml(input({ collectibles: [collectible({ name: "Tom & <Jerry>" })] }));
    expect(xml).toContain("Tom &amp; &lt;Jerry&gt;");
  });
});
