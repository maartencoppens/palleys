"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ACCEPTED_PHOTO_EXTENSIONS,
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  photoQualityMessage,
  qualityFromSize,
  type PhotoQuality,
} from "@/data/options";
import { formatFileSize } from "@/core/utils/format";

export type UploadedPhoto = {
  id: string;
  file: File;
  /** Object URL for previews; null when the browser can't display the format (e.g. HEIC). */
  previewUrl: string | null;
  quality: PhotoQuality;
};

type PhotoUploadProps = {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  error?: string;
};

const isAccepted = (file: File) =>
  ACCEPTED_PHOTO_TYPES.includes(file.type) ||
  ACCEPTED_PHOTO_EXTENSIONS.some((extension) =>
    file.name.toLowerCase().endsWith(extension),
  );

/** Reads the image's pixel size to judge sharpness; formats the browser can't decode come back "unknown". */
const inspectPhoto = (file: File): Promise<UploadedPhoto> => {
  const id = crypto.randomUUID();
  const previewUrl = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () =>
      resolve({
        id,
        file,
        previewUrl,
        quality: qualityFromSize(image.naturalWidth, image.naturalHeight),
      });
    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      resolve({ id, file, previewUrl: null, quality: "unknown" });
    };
    image.src = previewUrl;
  });
};

/*
 * Figma: dropzone + uploaded-file, extended to up to MAX_PHOTOS photos of the same pet.
 * - Before the first photo: the full dropzone. After that: a compact "Add another photo" zone with a
 *   counter, which disappears once the limit is reached.
 * - Every file is checked on its own (type, size, sharpness); a file that doesn't pass is named in the
 *   message, and files over the limit are named too, so nothing disappears silently.
 * - The count is announced to screen readers after every change.
 */
export default function PhotoUpload({
  photos,
  onChange,
  error,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Where keyboard focus goes after a photo is removed (its button disappears with it).
  const browseButtonRef = useRef<HTMLButtonElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const focusAfterRemoveRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  const remaining = MAX_PHOTOS - photos.length;
  const isFull = remaining <= 0;

  const addFiles = async (fileList: FileList | null | undefined) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    const issues: string[] = [];
    const valid = files.filter((file) => {
      if (!isAccepted(file)) {
        issues.push(`${file.name} is geen JPG-, PNG- of HEIC-foto.`);
        return false;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        issues.push(
          `${file.name} is ${formatFileSize(file.size)}; foto’s mogen maximaal 20 MB zijn.`,
        );
        return false;
      }
      return true;
    });

    const accepted = valid.slice(0, Math.max(remaining, 0));
    const skipped = valid.slice(accepted.length);
    if (skipped.length > 0) {
      issues.push(
        `Je kunt maximaal ${MAX_PHOTOS} foto’s toevoegen, dus ${skipped.map((file) => file.name).join(", ")} ${skipped.length === 1 ? "is" : "zijn"} niet toegevoegd.`,
      );
    }

    setProblems(issues);
    if (accepted.length > 0)
      onChange([...photos, ...(await Promise.all(accepted.map(inspectPhoto)))]);
  };

  const removePhoto = (photo: UploadedPhoto) => {
    if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    setProblems([]);
    focusAfterRemoveRef.current = true;
    onChange(photos.filter((item) => item.id !== photo.id));
  };

  // Runs once the list has re-rendered without the removed photo.
  useEffect(() => {
    if (!focusAfterRemoveRef.current) return;
    focusAfterRemoveRef.current = false;
    (addButtonRef.current ?? browseButtonRef.current)?.focus();
  }, [photos.length]);

  const openPicker = () => inputRef.current?.click();

  const dropHandlers = {
    onDragEnter: (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(true);
    },
    onDragOver: (event: React.DragEvent) => event.preventDefault(),
    onDragLeave: (event: React.DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node))
        setIsDragging(false);
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      addFiles(event.dataTransfer.files);
    },
  };

  const messages =
    error && photos.length === 0 ? [error, ...problems] : problems;

  return (
    <div className="flex flex-col gap-4">
      <p id="photo-intro" className="text-base leading-[1.5] text-text-primary">
        Voeg tot {MAX_PHOTOS} foto’s van je huisdier toe. Verschillende hoeken
        helpen ons om elk vlekje juist te krijgen.
      </p>

      <input
        ref={inputRef}
        id="photo-input"
        type="file"
        multiple
        accept={[...ACCEPTED_PHOTO_TYPES, ...ACCEPTED_PHOTO_EXTENSIONS].join(
          ",",
        )}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          addFiles(event.target.files);
          // Reset so picking the same file again (after removing it) still triggers a change.
          event.target.value = "";
        }}
      />

      {photos.length === 0 ? (
        <div
          {...dropHandlers}
          className={`flex flex-col items-center gap-3.5 rounded-3xl border-2 border-coral px-5 py-10 text-center transition-colors md:px-10 md:py-12 ${isDragging ? "border-solid bg-[#efc3b4]" : "border-dashed bg-pink"}`}
        >
          <span
            className="grid size-[72px] place-items-center rounded-full bg-coral"
            aria-hidden
          >
            <Image
              src="/images/create/upload.svg"
              width={27.5}
              height={27.5}
              alt=""
            />
          </span>
          <p className="font-display text-xl leading-[1.2] font-medium text-medium-green md:text-2xl">
            {isDragging ? "Laat ze hier maar los" : "Sleep je foto’s hierheen"}
          </p>
          <p className="text-base leading-[1.5] text-text-primary">of</p>
          <button
            ref={browseButtonRef}
            type="button"
            onClick={openPicker}
            aria-describedby="photo-intro photo-hint"
            className="w-full max-w-[277px] rounded-pill bg-medium-green px-2xl py-m text-xl leading-[19.5px] font-semibold text-button-primary-text transition hover:bg-medium-green-hover active:scale-[0.98] md:text-2xl"
          >
            Kies bestanden
          </button>
          <p
            id="photo-hint"
            className="text-base leading-[1.5] text-text-primary"
          >
            JPG, PNG of HEIC · max. 20 MB per foto
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3" aria-label="Je foto’s">
            {photos.map((photo, index) => (
              <li
                key={photo.id}
                className="flex items-center gap-4 rounded-[20px] bg-off-white p-3 md:p-4"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-[14px] bg-off-white-dark md:size-16">
                  {photo.previewUrl ? (
                    // A local object URL: next/image can't optimise it, so a plain img is used.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.previewUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="grid size-full place-items-center bg-coral">
                      <Image
                        src="/images/create/camera.svg"
                        width={18.3333}
                        height={15}
                        alt=""
                        aria-hidden
                      />
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate font-label text-base font-semibold text-text-primary md:text-lg">
                    {photo.file.name}
                    {index === 0 && photos.length > 1 && (
                      <span className="ml-2 rounded-full bg-light-green px-2 py-0.5 align-middle text-xs font-bold text-medium-green">
                        Voorbeeld
                      </span>
                    )}
                  </p>
                  <p
                    className={`flex items-start gap-1.5 text-sm leading-[1.5] md:text-base ${photo.quality === "small" ? "text-[#a3341a]" : "text-medium-green"}`}
                  >
                    {photo.quality !== "small" && (
                      <Image
                        className="mt-1.5 shrink-0"
                        src="/images/create/check-green.svg"
                        width={12.6667}
                        height={9.33333}
                        alt=""
                        aria-hidden
                      />
                    )}
                    <span>
                      {formatFileSize(photo.file.size)} ·{" "}
                      {photoQualityMessage[photo.quality]}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(photo)}
                  className="grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-off-white-dark"
                  aria-label={`Verwijder foto ${index + 1}: ${photo.file.name}`}
                >
                  <Image
                    src="/images/create/trash.svg"
                    width={18.3333}
                    height={20.1667}
                    alt=""
                  />
                </button>
              </li>
            ))}
          </ul>

          {isFull ? (
            <p className="rounded-[20px] bg-off-white px-4 py-3 text-base leading-[1.5] text-text-primary">
              Dat is het maximum van {MAX_PHOTOS} foto’s. Verwijder er een om
              een andere foto toe te voegen.
            </p>
          ) : (
            <div
              {...dropHandlers}
              className={`flex flex-col items-center gap-3 rounded-[20px] border-2 border-coral px-4 py-5 text-center transition-colors sm:flex-row sm:justify-between sm:text-left ${isDragging ? "border-solid bg-[#efc3b4]" : "border-dashed bg-pink"}`}
            >
              <p className="text-base leading-[1.5] text-text-primary">
                {isDragging ? (
                  "Laat ze hier maar los"
                ) : (
                  <>
                    <span className="font-semibold">
                      {photos.length} van {MAX_PHOTOS}
                    </span>{" "}
                    foto’s · je kunt er nog {remaining} toevoegen
                  </>
                )}
              </p>
              <button
                ref={addButtonRef}
                type="button"
                onClick={openPicker}
                aria-describedby="photo-hint-compact"
                className="shrink-0 rounded-pill bg-medium-green px-6 py-3 font-label text-base font-semibold text-button-primary-text transition hover:bg-medium-green-hover active:scale-[0.98]"
              >
                Nog een foto toevoegen
              </button>
              <p id="photo-hint-compact" className="sr-only">
                JPG, PNG of HEIC, max. 20 MB per foto
              </p>
            </div>
          )}
        </>
      )}

      {/* Announces the count after every change, without stealing focus. */}
      <p className="sr-only" aria-live="polite">
        {photos.length > 0
          ? `${photos.length} van ${MAX_PHOTOS} foto’s toegevoegd.`
          : ""}
      </p>

      {messages.length > 0 && (
        <div
          role="alert"
          className="flex flex-col gap-1 font-label text-base font-semibold text-[#a3341a]"
        >
          {messages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
