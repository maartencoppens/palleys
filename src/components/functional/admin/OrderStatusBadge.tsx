import type { OrderStatus, PaymentStatus } from "@/db/generated/enums";
import { Badge, type BadgeTone } from "@/components/design/Badge";

// Labels horen later in core/locale, zodra de NL/EN-vertalingen er zijn.
const ORDER_STATUS_DISPLAY: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  PENDING_PAYMENT: { label: "Wacht op betaling", tone: "neutral" },
  PAID: { label: "Betaald", tone: "success" },
  IN_PRODUCTION: { label: "In productie", tone: "waiting" },
  SHIPPED: { label: "Verzonden", tone: "success" },
  CANCELLED: { label: "Geannuleerd", tone: "neutral" },
  EXPIRED: { label: "Verlopen", tone: "neutral" },
  REFUNDED: { label: "Terugbetaald", tone: "danger" },
};

const PAYMENT_STATUS_DISPLAY: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  OPEN: { label: "Open", tone: "neutral" },
  PENDING: { label: "In behandeling", tone: "waiting" },
  AUTHORIZED: { label: "Geautoriseerd", tone: "waiting" },
  PAID: { label: "Betaald", tone: "success" },
  CANCELED: { label: "Geannuleerd", tone: "neutral" },
  EXPIRED: { label: "Verlopen", tone: "neutral" },
  FAILED: { label: "Mislukt", tone: "danger" },
};

export function orderStatusLabel(status: OrderStatus) {
  return ORDER_STATUS_DISPLAY[status].label;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, tone } = ORDER_STATUS_DISPLAY[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, tone } = PAYMENT_STATUS_DISPLAY[status];
  return <Badge tone={tone}>{label}</Badge>;
}
