"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AnimalOption } from "@/core/modules/animals/types";
import { postAnimalType } from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import Button from "@/components/design/Button";

type AnimalTypePickerProps = {
  previewId: string;
  value: string | null;
  /** The live animal list (Gepersonaliseerde Palley). */
  animals: AnimalOption[];
};

export function AnimalTypePicker({ previewId, value, animals }: AnimalTypePickerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChoose(animalType: string) {
    setSaving(animalType);
    setError(null);
    try {
      await postAnimalType(previewId, animalType);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mt-4">
      <div
        className="grid grid-cols-2 gap-2"
        role="group"
        aria-label="Diersoort"
      >
        {animals.map((option) => (
          <Button
            key={option.code}
            variant={value === option.code ? "primary" : "secondary"}
            aria-pressed={value === option.code}
            aria-disabled={saving !== null}
            onClick={() => saving === null && handleChoose(option.code)}
          >
            {option.labels.nl}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
