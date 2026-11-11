import type { LegalBlock, LegalSectionsDocument } from "./types";

/*
 * The editor in /admin/settings/legal keeps a paragraph and a list as one piece of text (a list one item per line); a
 * table stays a grid of cells. These turn a version into that and back. No server-only imports.
 */

export type DraftBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; text: string }
  | { type: "table"; head: string[]; rows: string[][] };
export type DraftSection = { title: string; blocks: DraftBlock[] };
export type DraftSectionsDocument = { title: string; intro: string; sections: DraftSection[] };

const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export function toDraftBlock(block: LegalBlock): DraftBlock {
  if (block.type === "paragraph") return { type: "paragraph", text: block.text };
  if (block.type === "list") return { type: "list", text: block.items.join("\n") };
  return { type: "table", head: [...block.head], rows: block.rows.map((row) => [...row]) };
}

export function fromDraftBlock(draft: DraftBlock): LegalBlock {
  if (draft.type === "paragraph") return { type: "paragraph", text: draft.text.trim() };
  if (draft.type === "list") return { type: "list", items: lines(draft.text) };
  const trim = (row: string[]) => row.map((cell) => cell.trim());
  return { type: "table", head: trim(draft.head), rows: draft.rows.map(trim).filter((row) => row.some(Boolean)) };
}

export const toDraft = (content: LegalSectionsDocument): DraftSectionsDocument => ({
  title: content.title,
  intro: content.intro,
  sections: content.sections.map((section) => ({ title: section.title, blocks: section.blocks.map(toDraftBlock) })),
});

export const fromDraft = (draft: DraftSectionsDocument): LegalSectionsDocument => ({
  title: draft.title.trim(),
  intro: draft.intro.trim(),
  sections: draft.sections.map((section) => ({ title: section.title.trim(), blocks: section.blocks.map(fromDraftBlock) })),
});

/** The first problem in a document, in words for the admin; null when it can be published. */
export function draftProblem(draft: DraftSectionsDocument): string | null {
  if (!draft.title.trim()) return "Vul een titel in";
  if (draft.sections.length === 0) return "Voeg minstens één sectie toe";
  for (const [index, section] of draft.sections.entries()) {
    const name = section.title.trim() || `Sectie ${index + 1}`;
    if (!section.title.trim()) return `${name} heeft geen titel`;
    if (section.blocks.length === 0) return `${name} is leeg`;
    for (const block of section.blocks) {
      const parsed = fromDraftBlock(block);
      if (parsed.type === "paragraph" && !parsed.text) return `${name}: een alinea is leeg`;
      if (parsed.type === "list" && parsed.items.length === 0) return `${name}: een opsomming is leeg`;
      if (parsed.type === "table") {
        if (parsed.head.some((cell) => !cell)) return `${name}: vul elke kolomkop van de tabel in`;
        if (parsed.rows.length === 0) return `${name}: een tabel heeft minstens één ingevulde rij nodig`;
      }
    }
  }
  return null;
}

export function move<T>(items: readonly T[], index: number, by: -1 | 1): T[] {
  const target = index + by;
  if (target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
