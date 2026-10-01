import type { PreviewStatus } from "@/db/client";
import { Badge, type BadgeTone } from "@/components/design/Badge";

// Labels horen later in core/locale, zodra de NL/EN-vertalingen er zijn.
const STATUS_DISPLAY: Record<
  PreviewStatus,
  { label: string; tone: BadgeTone }
> = {
  UPLOADED: { label: "Geüpload", tone: "neutral" },
  PAID: { label: "Betaald", tone: "neutral" },
  GENERATING_POSE: { label: "Pose wordt gemaakt", tone: "neutral" },
  POSE_READY: { label: "Pose klaar", tone: "neutral" },
  GENERATING_MODEL: { label: "Model wordt gemaakt", tone: "neutral" },
  MODEL_READY: { label: "Klaar voor review", tone: "waiting" },
  APPROVED: { label: "Goedgekeurd", tone: "success" },
  PRINT_READY: { label: "Klaar voor print", tone: "success" },
  FAILED: { label: "Mislukt", tone: "danger" },
  EXPIRED: { label: "Verlopen", tone: "neutral" },
};

type PreviewStatusBadgeProps = {
  status: PreviewStatus;
};

export function PreviewStatusBadge({ status }: PreviewStatusBadgeProps) {
  const { label, tone } = STATUS_DISPLAY[status];
  return <Badge tone={tone}>{label}</Badge>;
}
