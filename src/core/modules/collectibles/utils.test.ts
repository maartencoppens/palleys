import { describe, expect, it } from "vitest";
import {
  collectibleIdOf,
  collectibleImageKey,
  collectibleImageUrl,
  collectibleProductCode,
  isCollectibleImageFile,
  isCollectibleImageKey,
  slugify,
} from "./utils";

const FILE = "3f2a9c1e-1234-4abc-9def-0123456789ab.webp";

describe("collectible names", () => {
  it("makes plain URLs", () => {
    expect(slugify("Golden Retriever!")).toBe("golden-retriever");
    expect(slugify("  Café Kat & Hond ")).toBe("cafe-kat-hond");
    expect(slugify("***")).toBe("");
  });

  it("names a collectible by its number and animal", () => {
    expect(collectibleIdOf({ number: 7, animalCode: "HOND" })).toBe("COL-007-HOND");
    expect(collectibleIdOf({ number: 7, animalCode: null })).toBeNull();
  });

  it("codes an order line by the edition and attachment the customer chose", () => {
    expect(collectibleProductCode(7, "keychain", "clip")).toBe("COL-CLP-007");
    expect(collectibleProductCode(7, "keychain", "key-ring")).toBe("COL-RING-007");
    expect(collectibleProductCode(7, "figure", null)).toBe("COL-FIG-007");
    // A figurine has nothing to attach, whatever the line still remembers.
    expect(collectibleProductCode(7, "figure", "clip")).toBe("COL-FIG-007");
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
