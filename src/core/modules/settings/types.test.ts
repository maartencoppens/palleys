import { describe, expect, it } from "vitest";
import { animals, editions } from "@/data/options";
import { fromEuroInput, toEuroInput } from "@/core/utils/format";
import { catalogSettingsSchema, companySettingsSchema, localizedSiteContentSchema, siteContentSchema } from "./types";

const prices = { keychain: 2799, figurine: 2799 };

describe("catalog settings", () => {
  it("accepts prices and switched-off options", () => {
    expect(catalogSettingsSchema.safeParse({ prices, disabledAnimals: ["snake"], disabledEditions: ["figure"] }).success).toBe(true);
  });

  it("guards against typos and an empty shop", () => {
    const parse = (value: object) => catalogSettingsSchema.safeParse({ prices, disabledAnimals: [], disabledEditions: [], ...value }).success;
    expect(parse({ prices: { keychain: 50, figurine: 2799 } })).toBe(false);
    expect(parse({ prices: { keychain: 279900, figurine: 2799 } })).toBe(false);
    expect(parse({ disabledAnimals: animals.map((animal) => animal.value) })).toBe(false);
    expect(parse({ disabledEditions: editions.map((edition) => edition.value) })).toBe(false);
    expect(parse({ disabledAnimals: ["dinosaur"] })).toBe(false);
  });
});

describe("site content", () => {
  const content = { infoBannerMessages: ["Hallo"], deliveryTime: "2–3 weken", returnNote: "Geen retour", faq: [] };

  it("needs at least one banner message, the FAQ may be empty", () => {
    expect(siteContentSchema.safeParse(content).success).toBe(true);
    expect(siteContentSchema.safeParse({ ...content, infoBannerMessages: [] }).success).toBe(false);
  });

  it("is kept per language, and every language is needed", () => {
    expect(localizedSiteContentSchema.safeParse({ nl: content, en: content }).success).toBe(true);
    expect(localizedSiteContentSchema.safeParse({ nl: content }).success).toBe(false);
  });
});

describe("company settings", () => {
  const company = {
    legalName: "Palleys",
    address: "Straat 1, 9000 Gent",
    enterpriseNumber: "0000.000.000",
    email: "hallo@palleys.be",
    phone: "",
    socials: { instagram: "https://instagram.com/palleys", tiktok: "", facebook: "" },
  };

  it("only takes https links for the footer", () => {
    expect(companySettingsSchema.safeParse(company).success).toBe(true);
    const socials = { ...company.socials, instagram: "javascript:alert(1)" };
    expect(companySettingsSchema.safeParse({ ...company, socials }).success).toBe(false);
  });
});

describe("price fields", () => {
  it("reads Belgian and plain notation, and refuses the rest", () => {
    expect(fromEuroInput("27,99")).toBe(2799);
    expect(fromEuroInput("27.99")).toBe(2799);
    expect(fromEuroInput("5")).toBe(500);
    expect(fromEuroInput("abc")).toBeNull();
    expect(fromEuroInput("-1")).toBeNull();
    expect(toEuroInput(2799)).toBe("27,99");
  });
});
