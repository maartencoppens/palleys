import { describe, expect, it } from "vitest";
import { attachments, editions } from "@/data/options";
import { LOCALES, DEFAULT_LOCALE, localizedPath, stripLocale } from "../config";
import { fill } from "../fill";
import { MESSAGES } from "./index";

/** Every text with its place in the messages. Lists count too, so a missing FAQ step shows up. */
function flatten(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  return Object.entries(value as object).flatMap(([key, item]) => flatten(item, `${path}.${key}`));
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("translations", () => {
  const source = new Map(flatten(MESSAGES[DEFAULT_LOCALE]));

  for (const locale of LOCALES) {
    it(`${locale} has the same texts and placeholders as the default language`, () => {
      const target = new Map(flatten(MESSAGES[locale]));
      expect([...target.keys()].sort()).toEqual([...source.keys()].sort());
      for (const [path, text] of source) {
        expect(placeholders(target.get(path)!), path).toEqual(placeholders(text));
        expect(target.get(path)!.trim(), path).not.toBe("");
      }
    });

    // Animals aren't here: their names per language are managed with the animals (core/modules/animals).
    it(`${locale} names every option`, () => {
      const { options } = MESSAGES[locale];
      expect(Object.keys(options.editions).sort()).toEqual(editions.map((e) => e.value).sort());
      expect(Object.keys(options.attachments).sort()).toEqual(attachments.map((a) => a.value).sort());
    });
  }

  it("uses the same Dutch labels as the backoffice", () => {
    const { options } = MESSAGES.nl;
    for (const edition of editions) expect(options.editions[edition.value]).toBe(edition.label);
    for (const attachment of attachments) expect(options.attachments[attachment.value]).toBe(attachment.label);
  });
});

describe("paths", () => {
  it("leaves the default language without a prefix", () => {
    expect(localizedPath("/create", "nl")).toBe("/create");
    expect(localizedPath("/", "nl")).toBe("/");
  });

  it("prefixes every other language, hash and query included", () => {
    expect(localizedPath("/create", "en")).toBe("/en/create");
    expect(localizedPath("/", "en")).toBe("/en");
    expect(localizedPath("/#faq", "en")).toBe("/en#faq");
    expect(localizedPath("/shop/hond?x=1", "en")).toBe("/en/shop/hond?x=1");
  });

  it("leaves other sites alone", () => {
    expect(localizedPath("https://www.dierenasielgent.be/", "en")).toBe("https://www.dierenasielgent.be/");
    expect(localizedPath("//example.com", "en")).toBe("//example.com");
  });

  it("takes the language off a path", () => {
    expect(stripLocale("/en/create")).toBe("/create");
    expect(stripLocale("/nl/create")).toBe("/create");
    expect(stripLocale("/en")).toBe("/");
    expect(stripLocale("/create")).toBe("/create");
    expect(stripLocale("/english")).toBe("/english");
  });
});

describe("fill", () => {
  it("fills in what it knows and keeps the rest visible", () => {
    expect(fill("Binnen {time} en {other}", { time: "2 weken" })).toBe("Binnen 2 weken en {other}");
  });
});
