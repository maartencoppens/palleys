import { describe, expect, it } from "vitest";
import { editions } from "@/data/options";
import { DEFAULT_ANIMALS } from "@/data/animals";
import { fromEuroInput, toEuroInput } from "@/core/utils/format";
import { DEFAULT_ANIMAL_PROMPTS, POSE_PROMPT } from "@/data/prompts";
import {
  catalogSettingsSchema,
  companySettingsSchema,
  localizedSiteContentSchema,
  promptSettingsSchema,
  shippingSettingsSchema,
  siteContentSchema,
  storedShippingOverridesSchema,
  teamMailCc,
} from "./types";

const prices = { keychain: 2799, figurine: 2799 };

describe("catalog settings", () => {
  it("accepts prices and switched-off options, and the starting animals when none were saved", () => {
    const parsed = catalogSettingsSchema.safeParse({ prices, disabledAnimals: ["snake"], disabledEditions: ["figure"] });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.animals).toEqual(DEFAULT_ANIMALS);
  });

  it("takes an added animal, and no duplicates or half-named ones", () => {
    const parrot = { value: "papegaai", code: "PAPEGAAI", labels: { nl: "Papegaai", en: "Parrot" } };
    const parse = (animals: object[]) => catalogSettingsSchema.safeParse({ prices, animals, disabledAnimals: [], disabledEditions: [] }).success;
    expect(parse([...DEFAULT_ANIMALS, parrot])).toBe(true);
    expect(parse([...DEFAULT_ANIMALS, { ...parrot, value: "dog" }])).toBe(false);
    expect(parse([...DEFAULT_ANIMALS, { ...parrot, code: "HOND" }])).toBe(false);
    expect(parse([...DEFAULT_ANIMALS, { ...parrot, labels: { nl: "Papegaai", en: " " } }])).toBe(false);
    expect(parse([])).toBe(false);
  });

  it("guards against typos and an empty shop", () => {
    const parse = (value: object) => catalogSettingsSchema.safeParse({ prices, disabledAnimals: [], disabledEditions: [], ...value }).success;
    expect(parse({ prices: { keychain: 50, figurine: 2799 } })).toBe(false);
    expect(parse({ prices: { keychain: 279900, figurine: 2799 } })).toBe(false);
    expect(parse({ disabledAnimals: DEFAULT_ANIMALS.map((animal) => animal.value) })).toBe(false);
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

describe("prompt settings", () => {
  it("accepts the starting prompts, an animal without one and a new animal, but needs the general prompt", () => {
    const parse = (value: object) => promptSettingsSchema.safeParse(value).success;
    expect(parse({ base: POSE_PROMPT, animals: DEFAULT_ANIMAL_PROMPTS })).toBe(true);
    expect(parse({ base: POSE_PROMPT, animals: {} })).toBe(true);
    expect(parse({ base: POSE_PROMPT, animals: { PAPEGAAI: "A parrot." } })).toBe(true);
    expect(parse({ base: " ", animals: DEFAULT_ANIMAL_PROMPTS })).toBe(false);
    expect(parse({ base: POSE_PROMPT, animals: { "kat!": "x" } })).toBe(false);
  });
});

describe("company settings", () => {
  const saved = { legalName: "Palleys", address: "Bernheimlaan 26, 9050 Gentbrugge, België", enterpriseNumber: "", email: "hallo@palleys.be", phone: "", socials: { instagram: "", tiktok: "", facebook: "" } };

  it("gives settings saved before the return address existed the starting one", () => {
    expect(companySettingsSchema.parse(saved).returnAddress).toBe("Bernheimlaan 26, 9050 Gentbrugge");
  });

  it("keeps a return address the admin set", () => {
    expect(companySettingsSchema.parse({ ...saved, returnAddress: "Elders 1, 9000 Gent" }).returnAddress).toBe("Elders 1, 9000 Gent");
  });

  it("gives settings saved before the team inbox existed the Gmail, and lets the admin empty it", () => {
    expect(companySettingsSchema.parse(saved).teamEmail).toBe("palleys.team@gmail.com");
    expect(companySettingsSchema.parse({ ...saved, teamEmail: "" }).teamEmail).toBe("");
    expect(companySettingsSchema.safeParse({ ...saved, teamEmail: "geen-mail" }).success).toBe(false);
  });

  it("copies team mails to the team inbox, unless it is empty or the company address itself", () => {
    expect(teamMailCc({ email: "hallo@palleys.be", teamEmail: "palleys.team@gmail.com" })).toEqual(["palleys.team@gmail.com"]);
    expect(teamMailCc({ email: "hallo@palleys.be", teamEmail: "" })).toEqual([]);
    expect(teamMailCc({ email: "hallo@palleys.be", teamEmail: "Hallo@palleys.be" })).toEqual([]);
  });
});

describe("shipping settings", () => {
  const pickupOff = { "be-pickup-kantienberg": { enabled: false, priceCents: 0 } };

  it("reads saved prices without an option that was removed, keeping the rest as saved", () => {
    const stored = { "be-bpost-home": { enabled: true, priceCents: 495 }, ...pickupOff };
    expect(storedShippingOverridesSchema.parse(stored)).toEqual(pickupOff);
  });

  it("still refuses a broken price, and an unknown option when saving", () => {
    expect(storedShippingOverridesSchema.safeParse({ "be-pickup-kantienberg": { enabled: false, priceCents: -1 } }).success).toBe(false);
    expect(shippingSettingsSchema.safeParse({ shippingOverrides: { "be-bpost-home": { enabled: true, priceCents: 495 } } }).success).toBe(false);
  });
});
