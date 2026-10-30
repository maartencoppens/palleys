"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postGeneratePose } from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { Button } from "@/components/design/Button";

type GeneratePoseButtonProps = {
  previewId: string;
  hasPose: boolean;
  attemptsLeft: number;
};

export function GeneratePoseButton({
  previewId,
  hasPose,
  attemptsLeft,
}: GeneratePoseButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      await postGeneratePose(previewId);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
      router.refresh(); // ook bij een fout: de status kan FAILED geworden zijn
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <Button
        variant="primary"
        className="w-full"
        loading={loading}
        loadingText="Bezig met genereren…"
        disabled={attemptsLeft <= 0}
        onClick={handleClick}
      >
        {hasPose ? "Pose opnieuw genereren" : "Pose genereren"}
      </Button>
      <p className="text-sm text-text-muted">
        {attemptsLeft > 0
          ? `Nog ${attemptsLeft} ${attemptsLeft === 1 ? "poging" : "pogingen"}`
          : "Maximum aantal pogingen bereikt"}
      </p>
      {error && (
        <p role="alert" className="text-sm text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
