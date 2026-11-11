import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENT_SLUGS, LEGAL_DOCUMENTS } from "@/data/legal";
import { fallbackContent, fallbackVersion } from "./fallback";
import { belgianDay, legalContentSchema, nextVersionName, placeholdersIn, type LocalizedLegalContent } from "./types";

describe("the text in the code", () => {
  for (const slug of LEGAL_DOCUMENT_SLUGS) {
    it(`${slug} is a valid version, in every language, with only its own placeholders`, () => {
      const result = legalContentSchema(slug).safeParse(fallbackContent(slug));
      expect(result.success, JSON.stringify(!result.success && result.error.issues[0])).toBe(true);
    });
  }

  it("keeps the dates out of the intro: they come from the version", () => {
    for (const slug of LEGAL_DOCUMENT_SLUGS) {
      for (const content of Object.values(fallbackContent(slug))) {
        expect(content.intro).not.toMatch(/2026|bijgewerkt|updated/i);
      }
    }
  });

  it("is the terms version the checkout recorded so far", () => {
    expect(fallbackVersion("terms").version).toBe(LEGAL_DOCUMENTS.terms.fallbackVersion);
    expect(fallbackVersion("terms").published).toBe(false);
  });

  it("turns the contact details into rows, the phone row with {phone}", () => {
    const { nl } = fallbackContent("contact");
    expect(nl.rows.map((row) => row.value)).toContain("{phone}");
    expect(nl.seeAlso).toContain("{privacyPolicy}");
  });
});

describe("legalContentSchema", () => {
  const privacy = () => structuredClone(fallbackContent("privacy")) as LocalizedLegalContent<"privacy">;

  it("refuses a placeholder the page can't fill in", () => {
    const content = privacy();
    content.en.sections[0].blocks = [{ type: "paragraph", text: "Mail {deliveryPrices}" }];
    const result = legalContentSchema("privacy").safeParse(content);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["en", "sections", 0, "blocks", 0, "text"]);
    expect(result.error?.issues[0].message).toContain("{email}");
  });

  it("needs every language", () => {
    const { nl } = privacy();
    expect(legalContentSchema("privacy").safeParse({ nl }).success).toBe(false);
  });

  it("refuses an empty section and a table row of the wrong width", () => {
    const empty = privacy();
    empty.nl.sections[0].blocks = [];
    expect(legalContentSchema("privacy").safeParse(empty).success).toBe(false);

    const table = privacy();
    table.nl.sections[0].blocks = [{ type: "table", head: ["A", "B"], rows: [["1"]] }];
    expect(legalContentSchema("privacy").safeParse(table).success).toBe(false);
  });

  it("trims the texts", () => {
    const content = privacy();
    content.nl.title = "  Privacy  ";
    const result = legalContentSchema("privacy").parse(content) as LocalizedLegalContent<"privacy">;
    expect(result.nl.title).toBe("Privacy");
  });
});

describe("version names", () => {
  it("are the day, numbered from the second one that day", () => {
    expect(nextVersionName("2026-11-12", ["2026-11-11"])).toBe("2026-11-12");
    expect(nextVersionName("2026-11-12", ["2026-11-12"])).toBe("2026-11-12-2");
    expect(nextVersionName("2026-11-12", ["2026-11-12", "2026-11-12-2"])).toBe("2026-11-12-3");
  });

  it("use the day in Belgium", () => {
    expect(belgianDay(new Date("2026-11-11T23:30:00Z"))).toBe("2026-11-12");
  });

  it("finds placeholders", () => {
    expect(placeholdersIn("Mail {email} of {returnUrl}.")).toEqual(["email", "returnUrl"]);
  });
});
