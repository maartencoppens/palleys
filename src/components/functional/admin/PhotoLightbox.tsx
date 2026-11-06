"use client";

import { useEffect, useRef, useState } from "react";

type PhotoLightboxProps = {
  urls: string[];
  startIndex: number;
  onClose: () => void;
};

const SWIPE_DISTANCE_PX = 50;

const controlClassName =
  "flex size-12 items-center justify-center rounded-full bg-white/15 text-2xl text-white transition-colors hover:bg-white/30";

/* A customer's photos at full size. Arrow keys and swiping go through them, Esc or a tap beside the photo closes. */
export function PhotoLightbox({ urls, startIndex, onClose }: PhotoLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [index, setIndex] = useState(startIndex);
  const several = urls.length > 1;

  const go = (step: number) => setIndex((current) => (current + step + urls.length) % urls.length);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.documentElement.style.overflow = overflow;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={`Foto ${index + 1} van ${urls.length}`}
      onCancel={onClose}
      onKeyDown={(event) => {
        if (!several) return;
        if (event.key === "ArrowRight") go(1);
        if (event.key === "ArrowLeft") go(-1);
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/90 p-0 backdrop:bg-black/90"
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between gap-4 p-3 text-white">
          <p aria-hidden className="pl-2 font-label text-base font-bold tabular-nums">
            {index + 1} / {urls.length}
          </p>
          <div className="flex items-center gap-4">
            <a
              href={urls[index]}
              target="_blank"
              rel="noreferrer"
              className="font-label text-sm font-bold underline underline-offset-4"
            >
              Origineel
            </a>
            <button type="button" autoFocus onClick={onClose} aria-label="Sluiten" className={controlClassName}>
              ×
            </button>
          </div>
        </div>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-3 sm:px-20"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
          onTouchStart={(event) => {
            touchStartX.current = event.touches.length === 1 ? event.touches[0].clientX : null;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null || !several) return;
            const distance = event.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(distance) >= SWIPE_DISTANCE_PX) go(distance < 0 ? 1 : -1);
            touchStartX.current = null;
          }}
        >
          {/* Bewust <img>, niet next/image: klantfoto's (GDPR). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[index]} alt={`Foto ${index + 1}`} className="max-h-full max-w-full rounded-xl object-contain" />
          {several && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Vorige foto"
                className={`absolute top-1/2 left-3 -translate-y-1/2 ${controlClassName}`}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Volgende foto"
                className={`absolute top-1/2 right-3 -translate-y-1/2 ${controlClassName}`}
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
