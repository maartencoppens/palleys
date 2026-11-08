"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/design/Button";

type PoseComparisonProps = {
  photoUrls: string[];
  poseUrl: string;
};

const controlClassName =
  "flex size-12 items-center justify-center rounded-full bg-white/15 text-2xl text-white transition-colors hover:bg-white/30";

/*
 * The customer's photos beside the generated pose, as large as the screen allows: photos on the left in a grid, the
 * pose on the right; on a phone one above the other. A photo can be opened on its own to look at a detail.
 */
export function PoseComparison({ photoUrls, poseUrl }: PoseComparisonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Vergelijk pose met de foto&apos;s
      </Button>
      {open && <ComparisonDialog photoUrls={photoUrls} poseUrl={poseUrl} onClose={() => setOpen(false)} />}
    </>
  );
}

function ComparisonDialog({ photoUrls, poseUrl, onClose }: PoseComparisonProps & { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [focused, setFocused] = useState<number | null>(null);

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

  const several = photoUrls.length > 1;
  const shown = focused === null ? photoUrls : [photoUrls[focused]];

  return (
    <dialog
      ref={dialogRef}
      aria-label="Foto's en pose vergelijken"
      onCancel={(event) => {
        // Esc first goes back from one photo to all of them.
        if (focused !== null) {
          event.preventDefault();
          setFocused(null);
        } else onClose();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/90 p-0 text-white backdrop:bg-black/90"
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between gap-4 p-3">
          <p className="pl-2 font-label text-base font-bold">
            {focused === null ? `Foto's (${photoUrls.length}) en pose` : `Foto ${focused + 1} van ${photoUrls.length}`}
          </p>
          <div className="flex items-center gap-3">
            {focused !== null && (
              <button type="button" onClick={() => setFocused(null)} className="font-label text-sm font-bold underline underline-offset-4">
                Alle foto&apos;s
              </button>
            )}
            <button type="button" autoFocus onClick={onClose} aria-label="Sluiten" className={controlClassName}>
              ×
            </button>
          </div>
        </div>

        {/* Bewust <img>, niet next/image: klantfoto's gaan niet via de image optimizer (GDPR). */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto px-3 pb-3 lg:grid-cols-2 lg:overflow-hidden">
          <section aria-label="Foto's van de klant" className="flex min-h-0 flex-col gap-2 lg:overflow-y-auto">
            <h2 className="font-label text-sm font-semibold text-white/70">Foto&apos;s van de klant</h2>
            <div className={`grid min-h-0 flex-1 gap-3 ${shown.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {shown.map((url, index) => {
                const photoIndex = focused ?? index;
                return (
                  <button
                    key={url}
                    type="button"
                    disabled={!several}
                    onClick={() => setFocused(focused === null ? photoIndex : null)}
                    aria-label={focused === null ? `Foto ${photoIndex + 1} groot bekijken` : "Terug naar alle foto's"}
                    className="flex min-h-48 items-center justify-center rounded-xl bg-white/5 disabled:cursor-default"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Foto ${photoIndex + 1}`}
                      className={`max-w-full rounded-xl object-contain ${shown.length > 1 ? "max-h-[40dvh] lg:max-h-[42dvh]" : "max-h-[70dvh] lg:max-h-[85dvh]"}`}
                    />
                  </button>
                );
              })}
            </div>
          </section>
          <section aria-label="Pose" className="flex min-h-0 flex-col gap-2">
            <h2 className="font-label text-sm font-semibold text-white/70">Pose</h2>
            <div className="flex min-h-48 flex-1 items-center justify-center rounded-xl bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={poseUrl} alt="Pose" className="max-h-[70dvh] max-w-full rounded-xl object-contain lg:max-h-[85dvh]" />
            </div>
          </section>
        </div>
      </div>
    </dialog>
  );
}
