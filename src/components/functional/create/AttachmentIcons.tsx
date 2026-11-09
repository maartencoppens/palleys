import type { ReactNode } from "react";
import type { Attachment } from "@/data/options";

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "shrink-0",
} as const;

/* Minimal line drawings in the attachment chips, so people see what a clip and a key ring are. */
export const attachmentIcons: Record<Attachment, ReactNode> = {
  // Lobster clasp: a swivel eye on top, the claw below with its spring gate on the right.
  clip: (
    <svg {...iconProps}>
      <circle cx="12" cy="3.8" r="1.8" />
      <path d="M12 5.6v2" />
      <path d="M15.6 9.6C14.8 8.3 13.5 7.6 12 7.6c-3.1 0-5 3-5 6.6S9.2 21 12 21s5-3 5-6.8" />
      <path d="M15.6 9.6 17 14.2" />
    </svg>
  ),
  // Split key ring: a ring with the overlapping second turn.
  "key-ring": (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M13.7 2.35A9.8 9.8 0 0 1 21.65 10.3" />
    </svg>
  ),
};
