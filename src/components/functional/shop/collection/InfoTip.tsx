"use client";

import { useEffect, useId, useRef, useState } from "react";

/*
 * The "i" next to a label, with its explanation. Opens on hover with a mouse and on tap on a phone (Safari on iOS never
 * focuses a tapped button, so focus alone doesn't open it there); a second tap, a tap elsewhere or Escape closes it.
 */
export default function InfoTip({ label, explanation }: { label: string; explanation: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  // A mouse already opened it on hover: its click shouldn't close it again. A tap toggles.
  const pointerRef = useRef<string>("touch");
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className="relative inline-flex"
      onPointerEnter={(event) => event.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        aria-label={`${label}: ${explanation}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onPointerDown={(event) => {
          pointerRef.current = event.pointerType;
        }}
        onClick={(event) => {
          // Inside a card that is a link as a whole: the tap is for the tip, not the product page.
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => (pointerRef.current === "mouse" ? true : !current));
          pointerRef.current = "touch";
        }}
        // Keyboard focus opens it; a tap that focuses the button (Android) is handled by onClick alone.
        onFocus={(event) => event.currentTarget.matches(":focus-visible") && setOpen(true)}
        onBlur={() => setOpen(false)}
        className="grid size-6 touch-manipulation place-items-center rounded-full bg-medium-green font-label text-xs font-bold text-off-white focus-visible:ring-3 focus-visible:ring-accent-highlights"
      >
        <span aria-hidden>i</span>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[min(14rem,calc(100vw-3rem))] -translate-x-1/2 rounded-xl bg-medium-green px-3 py-1.5 text-sm text-off-white shadow-lg"
        >
          {explanation}
        </span>
      )}
    </span>
  );
}
