"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postGenerateModel } from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { Button } from "@/components/design/Button";

type GenerateModelButtonProps = {
  previewId: string;
  hasModel: boolean;
};

export function GenerateModelButton({
  previewId,
  hasModel,
}: GenerateModelButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const question = hasModel
      ? "Een nieuw 3D-model laten maken? Dit kost Meshy-credits."
      : "Pose goedkeuren en het 3D-model laten maken? Dit kost Meshy-credits.";
    if (!window.confirm(question)) return;

    setLoading(true);
    setError(null);
    try {
      await postGenerateModel(previewId);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
      router.refresh(); // ook bij een fout: de status kan FAILED geworden zijn
    }
  }

  return (
    <div className="mt-4">
      <Button
        className="w-full"
        loading={loading}
        loadingText="Taak starten…"
        onClick={handleClick}
      >
        {hasModel ? "Model opnieuw genereren" : "Pose goedkeuren"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
