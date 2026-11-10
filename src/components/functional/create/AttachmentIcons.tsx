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
  // Lobster clasp: the eye on top, a teardrop claw narrowing towards it, the spring gate crossing the opening on the
  // right and the thumb lever sticking out where you open it.
  clip: (
    <svg {...iconProps}>
      <circle cx="12" cy="3.2" r="1.9" />
      <path d="M12 5.1v1.4" />
      <path d="M12 6.5C9.4 8 7.2 11.4 7.2 15.6a4.8 4.8 0 0 0 9.6 0c0-2.6-.9-4.9-2.3-6.6" />
      <path d="M12 6.5c1.6.9 3 2.4 3.6 4.4" />
      <path d="M15.2 9.6l2.6-1.4" />
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
