"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { putPreviewEdition } from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { attachments, editions } from "@/data/options";
import { Button } from "@/components/design/Button";

// Keychain with each attachment, and the figure: the three things a customer can have.
const CHOICES = [
  ...attachments.map((attachment) => ({
    value: `keychain:${attachment.value}`,
    label: `${editions[0].label} · ${attachment.label}`,
    edition: "keychain",
    attachment: attachment.value as string | null,
  })),
  { value: "figure:", label: editions[1].label, edition: "figure", attachment: null },
];

type EditionPickerProps = {
  previewId: string;
  edition: string;
  attachment: string | null;
  locked: boolean;
};

/* Changes keychain/figure on the order when the customer asks after ordering. The price stays what was paid. */
export function EditionPicker({ previewId, edition, attachment, locked }: EditionPickerProps) {
  const router = useRouter();
  const current = `${edition}:${edition === "keychain" ? (attachment ?? "clip") : ""}`;
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    const choice = CHOICES.find((option) => option.value === value);
    if (!choice) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await putPreviewEdition(previewId, choice.edition, choice.attachment);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3">
      <fieldset disabled={locked || saving} className="flex flex-col gap-2 disabled:opacity-60">
        <legend className="sr-only">Uitvoering</legend>
        {CHOICES.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="radio"
              name={`edition-${previewId}`}
              checked={value === option.value}
              onChange={() => {
                setValue(option.value);
                setSaved(false);
              }}
              className="size-4 accent-medium-green"
            />
            <span className={option.value === current ? "font-semibold" : ""}>{option.label}</span>
          </label>
        ))}
      </fieldset>
      {!locked && value !== current && (
        <Button variant="primary" className="mt-3 w-full" loading={saving} loadingText="Opslaan…" onClick={save}>
          Uitvoering aanpassen
        </Button>
      )}
      {saved && (
        <p role="status" className="mt-2 text-sm font-semibold text-medium-green">
          Aangepast. De productcode en de printnaam volgen.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
