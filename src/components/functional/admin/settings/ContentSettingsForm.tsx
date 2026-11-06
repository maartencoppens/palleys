"use client";

import { useState } from "react";
import type { LocalizedSiteContent, SiteContent } from "@/core/modules/settings/types";
import Button from "@/components/design/Button";
import { Input, Textarea } from "@/components/design/form";
import { DEFAULT_LOCALE, LOCALE_LABELS, LOCALES, type Locale } from "@/core/locale/config";
import { SITE_CONTENT_LIMITS } from "@/data/site-content";
import { compactFieldClassName, fieldLabelClassName, SaveBar, SettingsCard } from "./SettingsParts";
import { useSettingsSave } from "./useSettingsSave";

const removeButtonClassName =
  "shrink-0 rounded font-label text-sm font-bold text-[#a3341a] underline underline-offset-4 disabled:opacity-50";

/** The first problem in a language's texts, in words for the admin. */
function problemIn(content: SiteContent) {
  if (!content.infoBannerMessages.some((text) => text.trim())) return "Hou minstens één boodschap in de banner";
  if (!content.deliveryTime.trim()) return "Vul een levertijd in";
  if (!content.returnNote.trim()) return "Vul de retourtekst in";
  if (content.faq.some((item) => !item.question.trim() || !item.answer.trim())) return "Elke vraag heeft een antwoord nodig";
  return null;
}

const cleaned = (content: SiteContent): SiteContent => ({
  infoBannerMessages: content.infoBannerMessages.map((text) => text.trim()).filter(Boolean),
  deliveryTime: content.deliveryTime.trim(),
  returnNote: content.returnNote.trim(),
  faq: content.faq,
});

/* One set of texts per language, saved together. The tabs follow LOCALES, so a new language shows up by itself. */
export function ContentSettingsForm({ content }: { content: LocalizedSiteContent }) {
  const [drafts, setDrafts] = useState(content);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const { save, saving, message, error, setError, setMessage } = useSettingsSave("content");

  const draft = drafts[locale];
  const { infoBannerMessages: messages, deliveryTime, returnNote, faq } = draft;
  const change = (patch: Partial<SiteContent>) => setDrafts((all) => ({ ...all, [locale]: { ...all[locale], ...patch } }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    for (const item of LOCALES) {
      const problem = problemIn(drafts[item]);
      if (problem) {
        setLocale(item);
        return setError(`${LOCALE_LABELS[item].name}: ${problem}`);
      }
    }
    void save(Object.fromEntries(LOCALES.map((item) => [item, cleaned(drafts[item])])) as LocalizedSiteContent);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
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

      <SettingsCard title="Levertijd en retour" intro="Staat op de homepage, in de configurator, het winkelmandje, de checkout en de bevestigingsmail.">
        <label htmlFor="delivery-time" className={fieldLabelClassName}>
          Levertijd (“Binnen … valt je Palley in de bus”)
        </label>
        <Input
          id="delivery-time"
          value={deliveryTime}
          maxLength={SITE_CONTENT_LIMITS.deliveryTime}
          onChange={(event) => change({ deliveryTime: event.target.value })}
          className={`mt-2 sm:max-w-xs ${compactFieldClassName}`}
        />
        <label htmlFor="return-note" className={`mt-5 block ${fieldLabelClassName}`}>
          Retourtekst bij gepersonaliseerde Palleys
        </label>
        <Textarea
          id="return-note"
          rows={3}
          maxLength={SITE_CONTENT_LIMITS.returnNote}
          value={returnNote}
          onChange={(event) => change({ returnNote: event.target.value })}
          className="mt-2 min-h-24 text-base!"
        />
      </SettingsCard>

      <SettingsCard title="Infobanner" intro="De gele strook boven de navigatie, op elke pagina.">
        <ul className="flex flex-col gap-3">
          {messages.map((text, index) => (
            <li key={index} className="flex items-center gap-3">
              <Input
                aria-label={`Boodschap ${index + 1}`}
                value={text}
                maxLength={SITE_CONTENT_LIMITS.infoBannerMessages.length}
                onChange={(event) => change({ infoBannerMessages: messages.map((item, i) => (i === index ? event.target.value : item)) })}
                className={compactFieldClassName}
              />
              <button
                type="button"
                className={removeButtonClassName}
                disabled={messages.length === 1}
                onClick={() => change({ infoBannerMessages: messages.filter((_, i) => i !== index) })}
              >
                Verwijderen
              </button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          disabled={messages.length >= SITE_CONTENT_LIMITS.infoBannerMessages.items}
          onClick={() => change({ infoBannerMessages: [...messages, ""] })}
        >
          Boodschap toevoegen
        </Button>
      </SettingsCard>

      <SettingsCard title="Veelgestelde vragen" intro="Op de homepage, in deze volgorde.">
        <ul className="flex flex-col gap-5">
          {faq.map((item, index) => (
            <li key={index} className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-off-white-dark p-4">
              <div className="flex items-center gap-3">
                <Input
                  aria-label={`Vraag ${index + 1}`}
                  placeholder="Vraag"
                  value={item.question}
                  maxLength={SITE_CONTENT_LIMITS.faq.question}
                  onChange={(event) =>
                    change({ faq: faq.map((row, i) => (i === index ? { ...row, question: event.target.value } : row)) })
                  }
                  className={compactFieldClassName}
                />
                <button
                  type="button"
                  className={removeButtonClassName}
                  onClick={() => change({ faq: faq.filter((_, i) => i !== index) })}
                >
                  Verwijderen
                </button>
              </div>
              <Textarea
                aria-label={`Antwoord ${index + 1}`}
                placeholder="Antwoord"
                rows={3}
                maxLength={SITE_CONTENT_LIMITS.faq.answer}
                value={item.answer}
                onChange={(event) =>
                  change({ faq: faq.map((row, i) => (i === index ? { ...row, answer: event.target.value } : row)) })
                }
                className="min-h-24 text-base!"
              />
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          disabled={faq.length >= SITE_CONTENT_LIMITS.faq.items}
          onClick={() => change({ faq: [...faq, { question: "", answer: "" }] })}
        >
          Vraag toevoegen
        </Button>
      </SettingsCard>

      <SaveBar saving={saving} message={message} error={error} />
    </form>
  );
}
