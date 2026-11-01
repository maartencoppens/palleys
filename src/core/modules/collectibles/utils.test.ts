import { describe, expect, it } from "vitest";
import { collectibleImageKey, collectibleImageUrl, isCollectibleImageFile, isCollectibleImageKey, skuForSlug, slugify } from "./utils";

const FILE = "3f2a9c1e-1234-4abc-9def-0123456789ab.webp";

describe("collectible names", () => {
  it("makes plain URLs and SKUs", () => {
    expect(slugify("Golden Retriever!")).toBe("golden-retriever");
    expect(slugify("  Café Kat & Hond ")).toBe("cafe-kat-hond");
    expect(slugify("***")).toBe("");
    expect(skuForSlug("golden-retriever")).toBe("PAL-COL-GOLDEN-RETRIEVER");
  });
});

describe("collectible images", () => {
  it("only accepts file names we generated", () => {
    expect(isCollectibleImageFile(FILE)).toBe(true);
    expect(isCollectibleImageFile("../previews/secret.webp")).toBe(false);
    expect(isCollectibleImageFile("3f2a9c1e.webp")).toBe(false);
    expect(isCollectibleImageFile(FILE.replace(".webp", ".jpg"))).toBe(false);
  });

  it("can't be pointed at a customer's photo", () => {
    expect(isCollectibleImageKey(collectibleImageKey(FILE))).toBe(true);
    expect(isCollectibleImageKey(`previews/x/${FILE}`)).toBe(false);
  });

  it("builds the public URL", () => {
    expect(collectibleImageUrl(collectibleImageKey(FILE))).toBe(`/api/collectibles/images/${FILE}`);
    expect(collectibleImageUrl(null)).toBeNull();
  });
});
