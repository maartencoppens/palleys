"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { AdminPhoto } from "@/core/modules/previews/types";
import { deleteAdminPhoto, patchPhotoInPrompt, uploadAdminPhoto } from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { ALLOWED_IMAGE_TYPES, MAX_PHOTOS_PER_PREVIEW, MAX_STORED_PHOTOS_PER_PREVIEW, MAX_UPLOAD_BYTES } from "@/data/uploads";
import { Button } from "@/components/design/Button";
import { PhotoLightbox } from "./PhotoLightbox";

type PhotoManagerProps = {
  previewId: string;
  photos: AdminPhoto[];
  canAdd: boolean;
};

/*
 * The photos of the pet. Each one is in or out of the prompt: only those in go to Nano Banana for the next pose, the rest
 * stay with the preview (a customer's photo is never thrown away for this). An admin can add photos, and remove the
 * ones they added themselves.
 */
export function PhotoManager({ previewId, photos, canAdd }: PhotoManagerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const inPrompt = photos.filter((photo) => photo.inPrompt).length;

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // zelfde bestand opnieuw kiezen moet ook werken
    if (files.length === 0) return;
    if (files.some((file) => file.size > MAX_UPLOAD_BYTES)) return setError("Een van de foto's is groter dan 10 MB.");
    if (photos.length + files.length > MAX_STORED_PHOTOS_PER_PREVIEW) {
      return setError(`Maximaal ${MAX_STORED_PHOTOS_PER_PREVIEW} foto's per preview.`);
    }
    await run("upload", async () => {
      for (const file of files) await uploadAdminPhoto(previewId, file);
    });
  }

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-medium text-medium-green">
          Foto&apos;s van het dier{" "}
          <span className="font-label text-sm font-semibold text-text-muted">
            {inPrompt}/{MAX_PHOTOS_PER_PREVIEW} in de prompt
          </span>
        </h2>
        {canAdd && (
          <>
            <Button variant="secondary" loading={busy === "upload"} loadingText="Uploaden…" disabled={busy !== null} onClick={() => inputRef.current?.click()}>
              Foto&apos;s toevoegen
            </Button>
            <input ref={inputRef} type="file" multiple accept={ALLOWED_IMAGE_TYPES.join(",")} onChange={handleFiles} className="hidden" />
          </>
        )}
      </div>
      <p className="mt-1 text-sm text-text-muted">
        Alleen aangevinkte foto&apos;s gaan mee naar Nano Banana bij een nieuwe pose. Uitvinken verwijdert niets.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[#a3341a]">
          {error}
        </p>
      )}

      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Foto ${index + 1} groot bekijken`}
              className={`block w-full overflow-hidden rounded-3xl ring-offset-2 transition-opacity hover:opacity-80 ${
                photo.inPrompt ? "ring-3 ring-medium-green" : "opacity-45"
              }`}
            >
              {/* Bewust <img> en geen next/image: die zou de klantfoto via de
                  image optimizer van de server proxyen en cachen (GDPR). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="aspect-square w-full bg-white object-cover" />
            </button>
            <label className="mt-2 flex cursor-pointer items-center gap-2 font-label text-sm font-semibold">
              <input
                type="checkbox"
                checked={photo.inPrompt}
                disabled={busy !== null}
                onChange={(event) => run(photo.id, () => patchPhotoInPrompt(previewId, photo.id, event.target.checked))}
                className="size-4 accent-medium-green"
              />
              {busy === photo.id ? "Bezig…" : "In de prompt"}
            </label>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-text-muted">
              <span className="truncate">{photo.uploadedBy ? `Door ${photo.uploadedBy}` : "Klant"}</span>
              {photo.uploadedBy && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Deze foto definitief verwijderen?")) void run(`delete-${photo.id}`, () => deleteAdminPhoto(previewId, photo.id));
                  }}
                  disabled={busy !== null}
                  className="rounded py-1 font-label text-xs font-bold text-[#a3341a] underline underline-offset-4 disabled:opacity-60"
                >
                  Verwijderen
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {openIndex !== null && (
        <PhotoLightbox urls={photos.map((photo) => photo.url)} startIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </section>
  );
}
