"use client";

import { useState } from "react";
import type { SiteContent } from "@/core/modules/settings/types";
import Button from "@/components/design/Button";
import { Input, Textarea } from "@/components/design/form";
import { SITE_CONTENT_LIMITS } from "@/data/site-content";
import { compactFieldClassName, fieldLabelClassName, SaveBar, SettingsCard } from "./SettingsParts";
import { useSettingsSave } from "./useSettingsSave";

const removeButtonClassName =
  "shrink-0 rounded font-label text-sm font-bold text-[#a3341a] underline underline-offset-4 disabled:opacity-50";

export function ContentSettingsForm({ content }: { content: SiteContent }) {
  const [messages, setMessages] = useState(content.infoBannerMessages);
  const [deliveryTime, setDeliveryTime] = useState(content.deliveryTime);
  const [returnNote, setReturnNote] = useState(content.returnNote);
  const [faq, setFaq] = useState(content.faq);
  const { save, saving, message, error, setError, setMessage } = useSettingsSave("content");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    const infoBannerMessages = messages.map((text) => text.trim()).filter(Boolean);
    if (infoBannerMessages.length === 0) return setError("Hou minstens één boodschap in de banner");
    if (!deliveryTime.trim()) return setError("Vul een levertijd in");
    if (!returnNote.trim()) return setError("Vul de retourtekst in");
    if (faq.some((item) => !item.question.trim() || !item.answer.trim())) return setError("Elke vraag heeft een antwoord nodig");
    void save({ infoBannerMessages, deliveryTime: deliveryTime.trim(), returnNote: returnNote.trim(), faq });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <SettingsCard title="Levertijd en retour" intro="Staat op de homepage, in de configurator, het winkelmandje, de checkout en de bevestigingsmail.">
        <label htmlFor="delivery-time" className={fieldLabelClassName}>
          Levertijd (“Binnen … valt je Palley in de bus”)
        </label>
        <Input
          id="delivery-time"
          value={deliveryTime}
          maxLength={SITE_CONTENT_LIMITS.deliveryTime}
          onChange={(event) => setDeliveryTime(event.target.value)}
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
          onChange={(event) => setReturnNote(event.target.value)}
          className="mt-2 min-h-24 text-base md:text-base"
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
                onChange={(event) => setMessages((list) => list.map((item, i) => (i === index ? event.target.value : item)))}
                className={compactFieldClassName}
              />
              <button
                type="button"
                className={removeButtonClassName}
                disabled={messages.length === 1}
                onClick={() => setMessages((list) => list.filter((_, i) => i !== index))}
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
          onClick={() => setMessages((list) => [...list, ""])}
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
                    setFaq((list) => list.map((row, i) => (i === index ? { ...row, question: event.target.value } : row)))
                  }
                  className={compactFieldClassName}
                />
                <button
                  type="button"
                  className={removeButtonClassName}
                  onClick={() => setFaq((list) => list.filter((_, i) => i !== index))}
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
                  setFaq((list) => list.map((row, i) => (i === index ? { ...row, answer: event.target.value } : row)))
                }
                className="min-h-24 text-base md:text-base"
              />
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          disabled={faq.length >= SITE_CONTENT_LIMITS.faq.items}
          onClick={() => setFaq((list) => [...list, { question: "", answer: "" }])}
        >
          Vraag toevoegen
        </Button>
      </SettingsCard>

      <SaveBar saving={saving} message={message} error={error} />
    </form>
  );
}
