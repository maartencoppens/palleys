"use client";

import { useState } from "react";
import Button from "@/components/design/Button";
import ChoiceChips from "@/components/design/ChoiceChips";
import { Textarea } from "@/components/design/form";
import { attachmentIcons } from "@/components/functional/create/AttachmentIcons";
import { useLocale, useMessages } from "@/core/locale/client";
import type { Locale } from "@/core/locale/config";
import type { CartLineView, UpdateCartLineInput } from "@/core/modules/cart/types";
import { MAX_NOTES_LENGTH } from "@/data/checkout";
import { attachments, DEFAULT_ATTACHMENT, type Attachment, type Edition } from "@/data/options";

export type CartAnimalOption = { value: string; labels: Record<Locale, string> };

type CartLineEditorProps = {
  line: CartLineView;
  /** The animals and editions on sale right now, as in the configurator. */
  animals: CartAnimalOption[];
  editions: readonly Edition[];
  onSave: (changes: Omit<UpdateCartLineInput, "lineId" | "quantity">) => Promise<void>;
  onCancel: () => void;
};

/*
 * Changing a line without starting over: a Palley op maat keeps its photos and can switch animal, keychain or figurine,
 * clip or key ring, and its notes; a collectible switches edition and attachment. Only what changed is sent.
 */
export default function CartLineEditor({ line, animals, editions, onSave, onCancel }: CartLineEditorProps) {
  const { cart: m, create, options } = useMessages();
  const locale = useLocale();
  const personalized = line.kind === "personalized";
  const [animal, setAnimal] = useState(line.animal);
  const [edition, setEdition] = useState<Edition>(line.edition ?? "keychain");
  const [attachment, setAttachment] = useState<Attachment>(line.attachment ?? DEFAULT_ATTACHMENT);
  const [notes, setNotes] = useState(line.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An animal that's no longer on sale stays visible as the current choice.
  const animalOptions = animals.map((option) => ({ value: option.value, label: option.labels[locale] }));
  if (personalized && line.animal && line.animalLabels && !animalOptions.some((option) => option.value === line.animal)) {
    animalOptions.unshift({ value: line.animal, label: line.animalLabels[locale] });
  }
  const editionValues = editions.includes(edition) ? editions : [edition, ...editions];

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...(personalized && animal !== line.animal && { animal: animal ?? undefined }),
        ...(edition !== line.edition && { edition }),
        ...(edition === "keychain" && attachment !== line.attachment && { attachment }),
        ...(personalized && notes.trim() !== (line.notes ?? "") && { notes: notes.trim() }),
      });
    } catch {
      setError(m.edit.error);
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-5 rounded-[20px] bg-page p-4 md:p-5">
      {personalized && (
        <ChoiceChips legend={create.choose.animal} name={`animal-${line.id}`} options={animalOptions} value={animal} onChange={setAnimal} />
      )}
      {editionValues.length > 1 && (
        <ChoiceChips
          legend={create.choose.edition}
          name={`edition-${line.id}`}
          options={editionValues.map((value) => ({ value, label: options.editions[value] }))}
          value={edition}
          onChange={setEdition}
        />
      )}
      {edition === "keychain" && (
        <ChoiceChips
          legend={create.choose.attachment}
          name={`attachment-${line.id}`}
          options={attachments.map((option) => ({
            value: option.value,
            label: options.attachments[option.value],
            icon: attachmentIcons[option.value],
          }))}
          value={attachment}
          onChange={setAttachment}
        />
      )}
      {personalized && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`notes-${line.id}`} className="font-label text-lg font-semibold text-text-primary md:text-xl">
            {create.order.notes} <span className="font-normal text-text-muted">{create.order.optional}</span>
          </label>
          <Textarea
            id={`notes-${line.id}`}
            rows={3}
            maxLength={MAX_NOTES_LENGTH}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={create.order.notesPlaceholder}
            className="min-h-24 bg-white text-base!"
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary" onClick={save} loading={saving} loadingText={m.edit.saving}>
          {m.edit.save}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="font-label text-base font-bold text-medium-green underline underline-offset-4 disabled:opacity-50"
        >
          {m.edit.cancel}
        </button>
      </div>
      {error && (
        <p role="alert" className="font-label text-base font-semibold text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
