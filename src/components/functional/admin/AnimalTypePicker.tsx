"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ANIMAL_TYPES, type AnimalType } from "@/data/animals";
import { postAnimalType } from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { Button } from "@/components/design/Button";

type AnimalTypePickerProps = {
  previewId: string;
  value: string | null;
};

export function AnimalTypePicker({ previewId, value }: AnimalTypePickerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<AnimalType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChoose(animalType: AnimalType) {
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
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Diersoort">
        {ANIMAL_TYPES.map((option) => (
          <Button
            key={option.code}
            variant={value === option.code ? "primary" : "secondary"}
            aria-pressed={value === option.code}
            loading={saving === option.code}
            disabled={saving !== null}
            onClick={() => handleChoose(option.code)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
