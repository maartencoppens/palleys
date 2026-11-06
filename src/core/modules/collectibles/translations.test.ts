import { describe, expect, it } from "vitest";
import { localizedTexts, missingTranslations, parseTranslations } from "./translations";

const row = { name: "Zwarte kat", description: "Een zwarte kat", tag: "Nieuw", translations: { en: { name: "Black cat" } } };

describe("collectible translations", () => {
  it("uses the translation, and the Dutch text where there is none yet", () => {
    expect(localizedTexts(row, "en")).toEqual({ name: "Black cat", description: "Een zwarte kat", tag: "Nieuw" });
    expect(localizedTexts(row, "nl").name).toBe("Zwarte kat");
  });

  it("lists every Dutch text that still needs a translation", () => {
    expect(missingTranslations({ ...row, translations: parseTranslations(row.translations) })).toEqual(["en.description", "en.tag"]);
    expect(missingTranslations({ ...row, description: null, tag: null, translations: { en: { name: "Black cat", description: null, tag: null } } })).toEqual([]);
  });

  it("ignores what the database holds when it isn't a translation", () => {
    expect(parseTranslations("nonsense")).toEqual({});
    expect(localizedTexts({ ...row, translations: null }, "en").name).toBe("Zwarte kat");
  });
});
