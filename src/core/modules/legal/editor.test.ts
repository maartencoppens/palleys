import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENT_SLUGS } from "@/data/legal";
import { draftProblem, fromDraft, fromDraftBlock, move, toDraft, toDraftBlock } from "./editor";
import { fallbackContent } from "./fallback";
import type { LegalSectionsDocument } from "./types";

describe("the editor's drafts", () => {
  it("give back the same document", () => {
    for (const slug of LEGAL_DOCUMENT_SLUGS) {
      if (slug === "contact") continue;
      for (const content of Object.values(fallbackContent(slug)) as LegalSectionsDocument[]) {
        expect(fromDraft(toDraft(content))).toEqual(content);
        expect(draftProblem(toDraft(content))).toBeNull();
      }
    }
  });

  it("read a list one item per line, skipping empty lines", () => {
    expect(fromDraftBlock({ type: "list", text: " Een \n\n Twee " })).toEqual({ type: "list", items: ["Een", "Twee"] });
  });

  it("keep a table as a grid, trimmed, without empty rows", () => {
    const block = { type: "table" as const, head: ["A", "B | C"], rows: [["1", "2"]] };
    expect(toDraftBlock(block)).toEqual(block);
    expect(fromDraftBlock({ type: "table", head: [" A", "B | C "], rows: [[" 1", "2 "], ["", " "]] })).toEqual(block);
  });

  it("name the first problem", () => {
    const base = { title: "Privacy", intro: "", sections: [{ title: "1. Wie", blocks: [{ type: "paragraph" as const, text: "Tekst" }] }] };
    expect(draftProblem(base)).toBeNull();
    expect(draftProblem({ ...base, title: " " })).toBe("Vul een titel in");
    expect(draftProblem({ ...base, sections: [{ title: "1. Wie", blocks: [] }] })).toBe("1. Wie is leeg");
    expect(draftProblem({ ...base, sections: [{ title: "T", blocks: [{ type: "table", head: ["A", ""], rows: [["1", "2"]] }] }] })).toContain("kolomkop");
    expect(draftProblem({ ...base, sections: [{ title: "T", blocks: [{ type: "table", head: ["A"], rows: [[""]] }] }] })).toContain("minstens één");
  });

  it("move items up and down within bounds", () => {
    expect(move(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(move(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});
