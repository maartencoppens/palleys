import { z } from "zod";
import type { OrderStatus, PaymentStatus } from "@/db/generated/enums";

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "IN_PRODUCTION",
  "SHIPPED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
] as const satisfies readonly OrderStatus[];

export const orderListQuerySchema = z.object({
  status: z.enum([...ORDER_STATUSES, "ATTENTION"]).optional(),
  q: z.string().trim().max(200).optional(),
});

export const resolveAttentionSchema = z.object({ note: z.string().trim().min(3).max(500) });

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export type AdminOrderListItem = {
  id: string;
  number: string;
  status: OrderStatus;
  name: string;
  email: string;
  country: string;
  totalCents: number;
  itemCount: number;
  paymentStatus: PaymentStatus | null;
  paymentMode: string | null;
  attention: boolean;
  createdAt: string;
  paidAt: string | null;
};

export type AdminOrderDetail = {
  id: string;
  number: string;
  status: OrderStatus;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: { street: string; houseNumber: string; postalCode: string; city: string; country: string };
  subtotalCents: number;
  shippingCents: number;
  vatCents: number;
  totalCents: number;
  termsVersion: string;
  termsAcceptedAt: string;
  locale: string;
  marketingOptIn: boolean;
  attentionReason: string | null;
  confirmationSentAt: string | null;
  paidAt: string | null;
  createdAt: string;
  items: {
    id: string;
    previewId: string;
    previewStatus: string;
    title: string;
    sku: string;
    size: string;
    quantity: number;
    unitCents: number;
    notes: string | null;
    photoUrl: string | null;
  }[];
  payments: {
    id: string;
    providerPaymentId: string;
    provider: string;
    mode: string | null;
    method: string | null;
    status: PaymentStatus;
    amountCents: number;
    refundedCents: number;
    chargedBackCents: number;
    lastSyncedAt: string | null;
    createdAt: string;
  }[];
  shipment: {
    label: string;
    carrier: string;
    deliveryType: string;
    priceCents: number;
    trackingCode: string | null;
    trackingUrl: string | null;
  } | null;
  statusChanges: { fromStatus: OrderStatus | null; toStatus: OrderStatus; source: string; note: string | null; createdAt: string }[];
};

export type AdminOrderStats = {
  paidToday: number;
  revenueTodayCents: number;
  pending: number;
  attention: number;
};
