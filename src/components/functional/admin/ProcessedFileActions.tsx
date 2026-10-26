"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getProcessedDownload,
  uploadProcessedFile,
} from "@/core/modules/print-prep/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { MAX_PRINT_FILE_BYTES } from "@/data/uploads";
import { Button } from "@/components/design/Button";

type ProcessedFileActionsProps = {
  previewId: string;
  hasProcessedFile: boolean;
};

// Upload van de zip uit Blender, en downloaden zodra er een is.
export function ProcessedFileActions({
  previewId,
  hasProcessedFile,
}: ProcessedFileActionsProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // zelfde bestand opnieuw kiezen moet ook werken
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Kies het .zip-bestand uit Blender.");
      return;
    }
    if (file.size > MAX_PRINT_FILE_BYTES) {
      setError("Dit bestand is groter dan 200 MB.");
      return;
    }
    if (
      hasProcessedFile &&
      !window.confirm("Het huidige verwerkte bestand vervangen?")
    ) {
      return;
    }

    setBusy("upload");
    setError(null);
    try {
      await uploadProcessedFile(previewId, file);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e, "Uploaden mislukt"));
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    setBusy("download");
    setError(null);
    try {
      const { url, fileName } = await getProcessedDownload(previewId);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {hasProcessedFile && (
          <Button
            loading={busy === "download"}
            loadingText="Bezig…"
            disabled={busy !== null}
            onClick={handleDownload}
          >
            Download
          </Button>
        )}
        <Button
          variant={hasProcessedFile ? "secondary" : "primary"}
          loading={busy === "upload"}
          loadingText="Uploaden…"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
        >
          {hasProcessedFile ? "Vervangen" : "Zip uploaden"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
