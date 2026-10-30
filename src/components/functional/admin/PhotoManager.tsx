"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { AdminPhoto } from "@/core/modules/previews/types";
import {
  deleteAdminPhoto,
  uploadAdminPhoto,
} from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_PHOTOS_PER_PREVIEW,
  MAX_UPLOAD_BYTES,
} from "@/data/uploads";
import { Button } from "@/components/design/Button";

type PhotoManagerProps = {
  previewId: string;
  photos: AdminPhoto[];
  canAdd: boolean;
  canDelete: boolean;
};

export function PhotoManager({
  previewId,
  photos,
  canAdd,
  canDelete,
}: PhotoManagerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // zelfde bestand opnieuw kiezen moet ook werken
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Deze foto is groter dan 10 MB.");
      return;
    }

    setBusy("upload");
    setError(null);
    try {
      await uploadAdminPhoto(previewId, file);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e, "Uploaden mislukt"));
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(photoId: string) {
    if (!window.confirm("Deze foto definitief verwijderen?")) return;
    setBusy(photoId);
    setError(null);
    try {
      await deleteAdminPhoto(previewId, photoId);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-medium text-medium-green">
          Foto&apos;s van het dier{" "}
          <span className="font-label text-sm font-semibold text-text-muted">
            {photos.length}/{MAX_PHOTOS_PER_PREVIEW}
          </span>
        </h2>
        {canAdd && (
          <>
            <Button
              variant="secondary"
              loading={busy === "upload"}
              loadingText="Uploaden…"
              disabled={busy !== null}
              onClick={() => inputRef.current?.click()}
            >
              Foto toevoegen
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              onChange={handleFile}
              className="hidden"
            />
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[#a3341a]">
          {error}
        </p>
      )}

      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            {/* Bewust <img> en geen next/image: die zou de klantfoto via de
                image optimizer van de server proxyen en cachen (GDPR). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={`Foto ${index + 1}`}
              className="aspect-square w-full rounded-3xl bg-white object-cover"
            />
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-text-muted">
              <span className="truncate">
                {photo.uploadedBy ? `Door ${photo.uploadedBy}` : "Klant"}
              </span>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  disabled={busy !== null}
                  className="rounded font-label font-bold text-[#a3341a] underline underline-offset-4 disabled:opacity-60"
                >
                  {busy === photo.id ? "Bezig…" : "Verwijderen"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!canDelete && photos.length === 1 && (
        <p className="mt-2 text-xs text-text-muted">
          De laatste foto kan niet weg. Upload eerst een nieuwe.
        </p>
      )}
    </section>
  );
}
