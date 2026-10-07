"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { generatePose } from "@/core/modules/previews/api";
import { Button } from "@/components/design/Button";

type Props = { previewId: string; hasPose: boolean; attemptsLeft: number };

export function GeneratePoseButton({
  previewId,
  hasPose,
  attemptsLeft,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      await generatePose(previewId);
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? (err.response?.data?.error ?? err.message)
          : "Er ging iets mis",
      );
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  const label = hasPose ? "Pose opnieuw genereren" : "Pose genereren";

  return (
    <div className="mt-3 space-y-2">
      <Button onClick={onClick} disabled={busy || attemptsLeft <= 0}>
        {busy ? "Bezig met genereren…" : label}
      </Button>
      <p className="text-sm text-muted">
        {attemptsLeft > 0
          ? `Nog ${attemptsLeft} ${attemptsLeft === 1 ? "poging" : "pogingen"}`
          : "Maximum aantal pogingen bereikt"}
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
