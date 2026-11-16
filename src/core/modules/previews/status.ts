import type { PreviewStatus } from "@/db/client";

// → POSE_READY without GENERATING_POSE: an admin uploaded a pose made elsewhere (on the preview page, or with a manual
// order, where it takes effect once the order is paid). An uploaded pose never goes further: approving it stays a click.
// → MODEL_READY / PRINT_READY without Meshy: an admin uploaded a 3D model they made themselves (core/modules/previews/
// model-zip.ts), to review like Meshy's, or already print-ready from Blender. Same places, same payment rule as a pose.
const TRANSITIONS: Record<PreviewStatus, PreviewStatus[]> = {
  UPLOADED: ["PAID", "EXPIRED"],
  PAID: ["GENERATING_POSE", "POSE_READY", "MODEL_READY", "PRINT_READY"],
  GENERATING_POSE: ["POSE_READY", "FAILED"],
  POSE_READY: ["GENERATING_MODEL", "GENERATING_POSE", "FAILED", "MODEL_READY", "PRINT_READY"],
  GENERATING_MODEL: ["MODEL_READY", "FAILED", "PRINT_READY"],
  MODEL_READY: ["APPROVED", "GENERATING_POSE", "GENERATING_MODEL", "POSE_READY", "PRINT_READY"],
  APPROVED: ["PRINT_READY"],
  PRINT_READY: [],
  FAILED: ["GENERATING_POSE", "GENERATING_MODEL", "APPROVED", "POSE_READY", "MODEL_READY", "PRINT_READY"],
  EXPIRED: [],
};

export function canTransition(from: PreviewStatus, to: PreviewStatus) {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: PreviewStatus,
    public readonly to: PreviewStatus,
  ) {
    super(`Invalid preview transition: ${from} -> ${to}`);
  }
}

export function assertTransition(from: PreviewStatus, to: PreviewStatus) {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

// Alle statussen van waaruit een overgang naar `to` toegelaten is.
export function statusesThatCanTransitionTo(to: PreviewStatus) {
  return (Object.keys(TRANSITIONS) as PreviewStatus[]).filter((from) =>
    canTransition(from, to),
  );
}

// Noodknop in de backoffice: een admin mag ELKE status zetten, bewust buiten
// TRANSITIONS om. Alleen bedoeld om vastgelopen previews recht te zetten.
export const ADMIN_SETTABLE_STATUSES = Object.keys(
  TRANSITIONS,
) as PreviewStatus[];
