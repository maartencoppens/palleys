import type { PreviewStatus } from "@/db/client";

const TRANSITIONS: Record<PreviewStatus, PreviewStatus[]> = {
  UPLOADED: ["PAID", "EXPIRED"],
  PAID: ["GENERATING_POSE"],
  GENERATING_POSE: ["POSE_READY", "FAILED"],
  POSE_READY: ["GENERATING_MODEL", "GENERATING_POSE", "FAILED"],
  GENERATING_MODEL: ["MODEL_READY", "FAILED"],
  MODEL_READY: ["APPROVED", "GENERATING_POSE", "GENERATING_MODEL"],
  APPROVED: ["PRINT_READY", "FAILED"],
  PRINT_READY: [],
  FAILED: ["GENERATING_POSE", "GENERATING_MODEL", "APPROVED"],
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
