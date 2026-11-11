"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/design/Button";
import { Input, Textarea } from "@/components/design/form";
import { DEFAULT_LOCALE, LOCALE_LABELS, LOCALES, type Locale } from "@/core/locale/config";
import { fetchLegalVersion, publishLegal } from "@/core/modules/legal/api";
import { draftProblem, fromDraft, move, toDraft, type DraftBlock, type DraftSectionsDocument } from "@/core/modules/legal/editor";
import type { LegalContactDocument, LegalDocumentSlug, LegalSectionsDocument, LegalVersionSummary, LocalizedLegalContent } from "@/core/modules/legal/types";
import { getApiErrorMessage } from "@/core/networking/api";
import { formatDay, formatDateTime } from "@/core/utils/format";
import { LEGAL_DOCUMENTS, LEGAL_LIMITS as L, LEGAL_PLACEHOLDER_HELP } from "@/data/legal";
import { compactFieldClassName, fieldLabelClassName, SaveBar, SettingsCard } from "./SettingsParts";

const smallButtonClassName =
  "shrink-0 rounded font-label text-sm font-bold text-medium-green underline underline-offset-4 hover:text-orange disabled:text-text-muted disabled:no-underline";
const removeButtonClassName = `${smallButtonClassName} text-[#a3341a]!`;

type Draft = DraftSectionsDocument | LegalContactDocument;
const isContact = (draft: Draft): draft is LegalContactDocument => "rows" in draft;

const toDrafts = (content: LocalizedLegalContent): Record<Locale, Draft> =>
  Object.fromEntries(
    LOCALES.map((locale) => {
      const document = content[locale];
      return [locale, "rows" in document ? structuredClone(document) : toDraft(document as LegalSectionsDocument)];
    }),
  ) as Record<Locale, Draft>;

function contactProblem(draft: LegalContactDocument) {
  if (!draft.title.trim()) return "Vul een titel in";
  if (draft.rows.length === 0) return "Voeg minstens één rij toe";
  if (draft.rows.some((row) => !row.label.trim() || !row.value.trim())) return "Elke rij heeft een label en een tekst nodig";
  return null;
}

const cleanedContact = (draft: LegalContactDocument): LegalContactDocument => ({
  title: draft.title.trim(),
  intro: draft.intro.trim(),
  rows: draft.rows.map((row) => ({ label: row.label.trim(), value: row.value.trim() })),
  seeAlso: draft.seeAlso.trim(),
});

/** Up, down and remove for an item in a list. */
function ItemControls({ index, count, onMove, onRemove, label }: { index: number; count: number; onMove: (by: -1 | 1) => void; onRemove: () => void; label: string }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3">
      <button type="button" className={smallButtonClassName} disabled={index === 0} onClick={() => onMove(-1)} aria-label={`${label} omhoog`}>
        ↑
      </button>
      <button type="button" className={smallButtonClassName} disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`${label} omlaag`}>
        ↓
      </button>
      <button type="button" className={removeButtonClassName} onClick={onRemove}>
        Verwijderen
      </button>
    </div>
  );
}

const BLOCK_LABELS: Record<DraftBlock["type"], string> = { paragraph: "Alinea", list: "Opsomming", table: "Tabel" };

function TableEditor({ block, onChange }: { block: Extract<DraftBlock, { type: "table" }>; onChange: (block: DraftBlock) => void }) {
  const columns = block.head.length;
  const setCell = (row: number | "head", column: number, value: string) =>
    onChange(
      row === "head"
        ? { ...block, head: block.head.map((cell, i) => (i === column ? value : cell)) }
        : { ...block, rows: block.rows.map((cells, r) => (r === row ? cells.map((cell, i) => (i === column ? value : cell)) : cells)) },
    );
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-1">
          <thead>
            <tr>
              {block.head.map((cell, column) => (
                <th key={column} className="text-left align-top">
                  <Input aria-label={`Kolomkop ${column + 1}`} value={cell} maxLength={L.tableCell} onChange={(event) => setCell("head", column, event.target.value)} className={`${compactFieldClassName} font-bold`} />
                </th>
              ))}
              <th className="w-0" />
            </tr>
          </thead>
          <tbody>
            {block.rows.map((cells, row) => (
              <tr key={row}>
                {cells.map((cell, column) => (
                  <td key={column} className="align-top">
                    <Textarea aria-label={`Rij ${row + 1}, kolom ${column + 1}`} rows={2} value={cell} maxLength={L.tableCell} onChange={(event) => setCell(row, column, event.target.value)} className="min-h-16 text-sm!" />
                  </td>
                ))}
                <td className="align-top">
                  <button type="button" className={removeButtonClassName} disabled={block.rows.length === 1} onClick={() => onChange({ ...block, rows: block.rows.filter((_, r) => r !== row) })}>
                    Rij weg
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-4">
        <button type="button" className={smallButtonClassName} disabled={block.rows.length >= L.tableRows} onClick={() => onChange({ ...block, rows: [...block.rows, block.head.map(() => "")] })}>
          Rij toevoegen
        </button>
        <button type="button" className={smallButtonClassName} disabled={columns >= L.tableColumns} onClick={() => onChange({ head: [...block.head, ""], rows: block.rows.map((cells) => [...cells, ""]), type: "table" })}>
          Kolom toevoegen
        </button>
        <button type="button" className={removeButtonClassName} disabled={columns === 1} onClick={() => onChange({ type: "table", head: block.head.slice(0, -1), rows: block.rows.map((cells) => cells.slice(0, -1)) })}>
          Laatste kolom weg
        </button>
      </div>
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: DraftBlock; onChange: (block: DraftBlock) => void }) {
  if (block.type === "table") return <TableEditor block={block} onChange={onChange} />;
  const list = block.type === "list";
  return (
    <Textarea
      aria-label={list ? "Opsomming, één punt per regel" : "Alinea"}
      placeholder={list ? "Eén punt per regel" : undefined}
      rows={list ? 5 : 4}
      maxLength={list ? L.listItems * (L.listItem + 1) : L.paragraph}
      value={block.text}
      onChange={(event) => onChange({ ...block, text: event.target.value })}
      className="min-h-24 text-base!"
    />
  );
}

const newBlock = (type: DraftBlock["type"]): DraftBlock =>
  type === "table" ? { type, head: ["", ""], rows: [["", ""]] } : { type, text: "" };

function SectionsEditor({ draft, onChange }: { draft: DraftSectionsDocument; onChange: (draft: DraftSectionsDocument) => void }) {
  const { sections } = draft;
  const setSections = (next: DraftSectionsDocument["sections"]) => onChange({ ...draft, sections: next });
  const setSection = (index: number, patch: Partial<DraftSectionsDocument["sections"][number]>) =>
    setSections(sections.map((section, i) => (i === index ? { ...section, ...patch } : section)));

  return (
    <SettingsCard title="Secties" intro="In deze volgorde op de pagina. Een sectie heeft een titel en één of meer blokken.">
      <ol className="flex flex-col gap-5">
        {sections.map((section, index) => (
          <li key={index} className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-off-white-dark p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input aria-label={`Titel sectie ${index + 1}`} placeholder="Titel van de sectie" value={section.title} maxLength={L.title} onChange={(event) => setSection(index, { title: event.target.value })} className={`min-w-0 flex-1 basis-64 ${compactFieldClassName} font-bold`} />
              <ItemControls label="Sectie" index={index} count={sections.length} onMove={(by) => setSections(move(sections, index, by))} onRemove={() => setSections(sections.filter((_, i) => i !== index))} />
            </div>
            {section.blocks.map((block, blockIndex) => (
              <div key={blockIndex} className="flex flex-col gap-2 border-l-2 border-medium-green/20 pl-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={fieldLabelClassName}>{BLOCK_LABELS[block.type]}</span>
                  <ItemControls
                    label={BLOCK_LABELS[block.type]}
                    index={blockIndex}
                    count={section.blocks.length}
                    onMove={(by) => setSection(index, { blocks: move(section.blocks, blockIndex, by) })}
                    onRemove={() => setSection(index, { blocks: section.blocks.filter((_, i) => i !== blockIndex) })}
                  />
                </div>
                <BlockEditor block={block} onChange={(next) => setSection(index, { blocks: section.blocks.map((item, i) => (i === blockIndex ? next : item)) })} />
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-4">
              <span className={fieldLabelClassName}>Toevoegen:</span>
              {(["paragraph", "list", "table"] as const).map((type) => (
                <button key={type} type="button" className={smallButtonClassName} disabled={section.blocks.length >= L.blocks} onClick={() => setSection(index, { blocks: [...section.blocks, newBlock(type)] })}>
                  {BLOCK_LABELS[type]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <Button type="button" variant="secondary" className="mt-4" disabled={sections.length >= L.sections} onClick={() => setSections([...sections, { title: "", blocks: [newBlock("paragraph")] }])}>
        Sectie toevoegen
      </Button>
    </SettingsCard>
  );
}

function ContactEditor({ draft, onChange }: { draft: LegalContactDocument; onChange: (draft: LegalContactDocument) => void }) {
  const { rows } = draft;
  const setRows = (next: LegalContactDocument["rows"]) => onChange({ ...draft, rows: next });
  return (
    <SettingsCard title="Gegevens" intro="Label en tekst per rij. Een rij met {phone} verdwijnt als er geen telefoonnummer is ingesteld.">
      <ol className="flex flex-col gap-4">
        {rows.map((row, index) => (
          <li key={index} className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-off-white-dark p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input aria-label={`Label rij ${index + 1}`} placeholder="Label" value={row.label} maxLength={L.contactLabel} onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)))} className={`min-w-0 flex-1 basis-64 ${compactFieldClassName} font-bold`} />
              <ItemControls label="Rij" index={index} count={rows.length} onMove={(by) => setRows(move(rows, index, by))} onRemove={() => setRows(rows.filter((_, i) => i !== index))} />
            </div>
            <Textarea aria-label={`Tekst rij ${index + 1}`} rows={2} value={row.value} maxLength={L.contactValue} onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)))} className="min-h-16 text-base!" />
          </li>
        ))}
      </ol>
      <Button type="button" variant="secondary" className="mt-4" disabled={rows.length >= L.contactRows} onClick={() => setRows([...rows, { label: "", value: "" }])}>
        Rij toevoegen
      </Button>
      <label htmlFor="legal-see-also" className={`mt-6 block ${fieldLabelClassName}`}>
        Slotregel (bv. links naar de andere pagina’s)
      </label>
      <Textarea id="legal-see-also" rows={2} value={draft.seeAlso} maxLength={L.seeAlso} onChange={(event) => onChange({ ...draft, seeAlso: event.target.value })} className="mt-2 min-h-16 text-base!" />
    </SettingsCard>
  );
}

function Placeholders({ slug }: { slug: LegalDocumentSlug }) {
  return (
    <SettingsCard title="Invulvelden" intro="Typ ze letterlijk in een tekst, met de accolades: de website vult ze live in. Andere worden geweigerd.">
      <ul className="grid gap-2 sm:grid-cols-2">
        {LEGAL_DOCUMENTS[slug].placeholders.map((name) => (
          <li key={name} className="text-sm">
            <code className="rounded bg-off-white px-1.5 py-0.5 font-mono text-medium-green">{`{${name}}`}</code>{" "}
            <span className="text-text-muted">{LEGAL_PLACEHOLDER_HELP[name]}</span>
          </li>
        ))}
      </ul>
    </SettingsCard>
  );
}

function History({ versions, current, onUse, loading }: { versions: LegalVersionSummary[]; current: string; onUse: (version: string) => void; loading: string | null }) {
  return (
    <SettingsCard title="Versies" intro="Elke publicatie is een nieuwe versie; oudere blijven bewaard en bereikbaar.">
      <ul className="flex flex-col divide-y divide-off-white-dark">
        {versions.map((version) => (
          <li key={version.version} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-label font-bold text-medium-green">
                {version.version}
                {version.version === current && <span className="ml-2 text-sm font-semibold text-text-muted">(huidige)</span>}
              </p>
              <p className="text-sm text-text-muted">
                {version.published && version.publishedAt
                  ? `Gepubliceerd door ${version.publishedBy} op ${formatDateTime(version.publishedAt)}`
                  : `Starttekst uit de code, ${formatDay(version.effectiveDate)}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <a href={`${LEGAL_DOCUMENTS[version.document].path}?versie=${encodeURIComponent(version.version)}`} target="_blank" rel="noreferrer" className={smallButtonClassName}>
                Bekijken
              </a>
              {version.version !== current && (
                <button type="button" className={smallButtonClassName} disabled={loading !== null} onClick={() => onUse(version.version)}>
                  {loading === version.version ? "Laden…" : "Als basis gebruiken"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </SettingsCard>
  );
}

type LegalDocumentFormProps = {
  slug: LegalDocumentSlug;
  content: LocalizedLegalContent;
  currentVersion: string;
  versions: LegalVersionSummary[];
};

/* One legal page in every language, published together as a new version. */
export function LegalDocumentForm({ slug, content, currentVersion, versions }: LegalDocumentFormProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState(() => toDrafts(content));
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draft = drafts[locale];
  const change = (next: Draft) => setDrafts((all) => ({ ...all, [locale]: next }));

  async function useVersion(version: string) {
    setLoading(version);
    setError(null);
    setMessage(null);
    try {
      const found = await fetchLegalVersion(slug, version);
      setDrafts(toDrafts(found.content));
      setMessage(`Versie ${version} staat in het formulier. Publiceer om ze opnieuw te laten gelden.`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    for (const item of LOCALES) {
      const value = drafts[item];
      const problem = isContact(value) ? contactProblem(value) : draftProblem(value);
      if (problem) {
        setLocale(item);
        return setError(`${LOCALE_LABELS[item].name}: ${problem}`);
      }
    }
    const confirmText =
      slug === "terms"
        ? "Publiceren als nieuwe versie? Nieuwe bestellingen aanvaarden vanaf nu deze voorwaarden; oudere bestellingen houden hun versie."
        : "Publiceren als nieuwe versie? Ze staat meteen op de website.";
    if (!window.confirm(confirmText)) return;

    const content = Object.fromEntries(
      LOCALES.map((item) => {
        const value = drafts[item];
        return [item, isContact(value) ? cleanedContact(value) : fromDraft(value)];
      }),
    ) as LocalizedLegalContent;
    setSaving(true);
    try {
      const published = await publishLegal(slug, content);
      setMessage(`Gepubliceerd als versie ${published.version}`);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const languageTabs: ReactNode = (
    <div role="group" aria-label="Taal" className="flex flex-wrap gap-2">
      {LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={item === locale}
          onClick={() => setLocale(item)}
          className={`rounded-full border-[1.5px] px-4 py-1.5 font-label text-sm font-bold transition-colors ${
            item === locale ? "border-medium-green bg-medium-green text-off-white" : "border-medium-green/30 bg-white text-medium-green hover:bg-off-white"
          }`}
        >
          {LOCALE_LABELS[item].name}
        </button>
      ))}
    </div>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {languageTabs}

      <SettingsCard title="Titel en inleiding" intro="“Laatst bijgewerkt op …” (bij de voorwaarden ook de versie) zet de website er zelf voor.">
        <label htmlFor="legal-title" className={fieldLabelClassName}>
          Titel
        </label>
        <Input id="legal-title" value={draft.title} maxLength={L.title} onChange={(event) => change({ ...draft, title: event.target.value })} className={`mt-2 ${compactFieldClassName}`} />
        <label htmlFor="legal-intro" className={`mt-5 block ${fieldLabelClassName}`}>
          Inleiding (optioneel)
        </label>
        <Textarea id="legal-intro" rows={2} value={draft.intro} maxLength={L.intro} onChange={(event) => change({ ...draft, intro: event.target.value })} className="mt-2 min-h-16 text-base!" />
      </SettingsCard>

      <Placeholders slug={slug} />

      {isContact(draft) ? <ContactEditor draft={draft} onChange={change} /> : <SectionsEditor draft={draft} onChange={change} />}

      <SaveBar saving={saving} message={message} error={error} label="Publiceren als nieuwe versie" />

      <History versions={versions} current={currentVersion} onUse={useVersion} loading={loading} />
    </form>
  );
}
