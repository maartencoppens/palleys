import { z } from "zod";
import type { BatchStatus, OrderStatus } from "@/db/generated/enums";
import { MAX_BATCH_ORDERS, PICKUP_UPDATE_MAX_LENGTH } from "@/data/batches";
import { ORDER_STEPS } from "./steps";
import type { PalleyComment } from "./comments";

export const batchOrdersSchema = z.object({ orderIds: z.array(z.uuid()).min(1).max(MAX_BATCH_ORDERS) });
export const batchActionSchema = z.object({ action: z.enum(["send_to_jlc", "received", "ship_all_deliveries"]) });
export const pickupUpdateSchema = z.object({
  message: z.object({
    nl: z.string().trim().min(1).max(PICKUP_UPDATE_MAX_LENGTH),
    en: z.string().trim().max(PICKUP_UPDATE_MAX_LENGTH).optional().transform((value) => value || undefined),
  }),
});
/** Sending an order to a later step by hand (batches/service.ts forwardOrderToStep). No batchId = a new batch. */
export const orderStepSchema = z.object({
  step: z.enum(ORDER_STEPS),
  batchId: z.uuid().nullish(),
  reason: z.string().trim().min(3).max(500),
});
export type OrderStepInput = z.infer<typeof orderStepSchema>;

export const finishedQuerySchema = z.object({
  tab: z.enum(["delivered", "collected"]).catch("delivered"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type BatchItemView = {
  id: string;
  kind: "personalized" | "collectible";
  title: string;
  palleyName: string | null;
  productCode: string;
  quantity: number;
  thumbnailUrl: string | null;
  printReady: boolean;
  checkedInAt: string | null;
  checkedInBy: string | null;
  /** Extras (a Santa hat…), as labels: check them at check-in. */
  addons: string[];
  /** What the customer and the team wrote about this Palley, oldest first. */
  comments: PalleyComment[];
};

export type BatchOrderView = {
  id: string;
  number: string;
  status: OrderStatus;
  paidAt: string | null;
  customerName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  deliveryType: string | null;
  deliveryLabel: string | null;
  group: "deliver" | "pickup" | "other";
  shippedAt: string | null;
  trackingCode: string | null;
  readyForPickupAt: string | null;
  lastPickupUpdateAt: string | null;
  attentionReason: string | null;
  allCheckedIn: boolean;
  items: BatchItemView[];
  /** What the team wrote about the whole order (notepad, typed reasons), oldest first. */
  comments: PalleyComment[];
};

export type BatchView = {
  id: string;
  ref: string;
  status: BatchStatus;
  createdAt: string;
  createdBy: string;
  sentToJlcAt: string | null;
  sentToJlcBy: string | null;
  receivedAt: string | null;
  receivedBy: string | null;
  completedAt: string | null;
  counts: { orders: number; palleys: number; copies: number };
  orders: BatchOrderView[];
};

export type BpostProblemView = { orderNumber: string; problems: string[] };

export type BatchesPage = { ready: BatchOrderView[]; waiting: number; openBatches: BatchView[] };

export type ProductionBatchView = BatchView & { bpostProblems: BpostProblemView[]; bpostLabels: number };

export type ProductionPage = {
  sent: BatchView[];
  postProduction: ProductionBatchView[];
  /** Pickup orders that are ready and not collected yet: who a pickup update goes to. */
  waitingForPickup: { id: string; number: string; customerName: string; locale: string; readyForPickupAt: string; lastPickupUpdateAt: string | null }[];
};

export type FinishedOrderView = {
  id: string;
  number: string;
  customerName: string;
  batchRef: string | null;
  deliveryType: string | null;
  shippedAt: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  readyForPickupAt: string | null;
};

export type FinishedOrdersPage = { tab: "delivered" | "collected"; page: number; pageCount: number; orders: FinishedOrderView[] };
