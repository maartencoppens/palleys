"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadOwnModel } from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { ownModelFileProblem } from "@/core/modules/previews/own-model";
import { Button } from "@/components/design/Button";

type OwnModelUploadProps = {
  previewId: string;
  /** There is a model already (Meshy's or an earlier upload): it gets replaced. */
  hasModel: boolean;
};

/*
 * A 3D model made elsewhere, instead of Meshy's: the preview carries on after Meshy (Klaar voor review), or, when it is
 * already the print-ready zip from Blender, straight to Processed (Klaar voor print).
 */
export function OwnModelUpload({ previewId, hasModel }: OwnModelUploadProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [printReady, setPrintReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    const problem = ownModelFileProblem(file);
    if (problem) return setError(problem);
    const question = printReady
      ? "Dit model als printklaar uploaden? De preview gaat meteen naar Klaar voor print."
      : hasModel
        ? "Het huidige 3D-model vervangen door dit model?"
        : null;
    if (question && !window.confirm(question)) return;

    setBusy(true);
    setError(null);
    try {
      await uploadOwnModel(previewId, file, printReady);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e, "Uploaden mislukt"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={printReady}
          onChange={(event) => setPrintReady(event.target.checked)}
          className="mt-0.5 size-4 accent-medium-green"
        />
        <span>
          Al klaar voor print (zip uit Blender)
          <span className="block text-text-muted">Slaat review, Goedgekeurd en Blender over.</span>
        </span>
      </label>
      <input
        ref={fileRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = ""; // the same file again must work too
          if (file) void upload(file);
        }}
      />
      <Button variant="secondary" className="w-full" loading={busy} loadingText="Uploaden en controleren…" onClick={() => fileRef.current?.click()}>
        {hasModel ? "Ander 3D-model uploaden" : "Eigen 3D-model uploaden"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
