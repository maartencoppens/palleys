import type { PreviewStatus } from "@/db/client";

const TRANSITIONS: Record<PreviewStatus, PreviewStatus[]> = {
  UPLOADED: ["GENERATING_POSE", "FAILED", "EXPIRED"],
  GENERATING_POSE: ["POSE_READY", "FAILED"],
  POSE_READY: ["GENERATING_MODEL", "FAILED", "EXPIRED"],
  GENERATING_MODEL: ["MODEL_READY", "FAILED"],
  MODEL_READY: ["ORDERED", "EXPIRED"],
  ORDERED: [],
  FAILED: [],
  EXPIRED: [],
};

export function canTransition(from: PreviewStatus, to: PreviewStatus) {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: PreviewStatus, to: PreviewStatus) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid preview transition: ${from} -> ${to}`);
  }
}
