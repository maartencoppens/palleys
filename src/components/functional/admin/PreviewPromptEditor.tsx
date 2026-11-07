"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { putPromptOverride } from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { Button } from "@/components/design/Button";
import { Textarea } from "@/components/design/form";

/* The prompt of a new collectible's model: change it here, then make a new pose. */
export function PreviewPromptEditor({ previewId, prompt }: { previewId: string; prompt: string }) {
  const router = useRouter();
  const [value, setValue] = useState(prompt);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await putPromptOverride(previewId, value);
      setMessage("Opgeslagen. Maak een nieuwe pose om hem te gebruiken.");
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3">
      <Textarea
        aria-label="Prompt voor deze preview"
        rows={10}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setMessage(null);
        }}
        className="min-h-48 font-mono text-xs!"
      />
      <Button
        variant="secondary"
        className="mt-3 w-full"
        loading={saving}
        loadingText="Opslaan…"
        disabled={value.trim() === prompt.trim() || !value.trim()}
        onClick={save}
      >
        Prompt opslaan
      </Button>
      {message && <p className="mt-2 text-sm text-medium-green">{message}</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
