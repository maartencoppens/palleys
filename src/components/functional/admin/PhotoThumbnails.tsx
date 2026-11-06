"use client";

import { useState } from "react";
import { PhotoLightbox } from "./PhotoLightbox";

type PhotoThumbnailsProps = {
  urls: string[];
  /** Show only this many; the rest appear as "+2" on the last one, and in the large view. */
  limit?: number;
  className?: string;
};

/* Small customer photos that open at full size. */
export function PhotoThumbnails({ urls, limit = urls.length, className = "size-12" }: PhotoThumbnailsProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const shown = urls.slice(0, limit);
  const hiddenCount = urls.length - shown.length;

  return (
    <>
      <div className="flex shrink-0 flex-wrap gap-1">
        {shown.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpenIndex(index)}
            aria-label={`Foto ${index + 1} van ${urls.length} groot bekijken`}
            className={`relative overflow-hidden rounded-xl bg-off-white-dark transition-opacity hover:opacity-80 ${className}`}
          >
            {/* Bewust <img>, niet next/image: klantfoto's (GDPR). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" loading="lazy" className="size-full object-cover" />
            {hiddenCount > 0 && index === shown.length - 1 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 font-label text-sm font-bold text-white">
                +{hiddenCount}
              </span>
            )}
          </button>
        ))}
      </div>
      {openIndex !== null && <PhotoLightbox urls={urls} startIndex={openIndex} onClose={() => setOpenIndex(null)} />}
    </>
  );
}
