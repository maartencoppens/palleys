import type { BatchStatus, OrderStatus, PreviewStatus } from "@/db/generated/enums";

/*
 * The human check before an order leaves: every item is looked at and ticked off by an admin. A personalised Palley
 * first has to get through the pipeline (Te reviewen → Goedgekeurd → Processed); a collectible can be ticked off
 * straight away. Pure, so the order page, the dashboard and the server all apply the same rules.
 */

/** `cancelled`: every copy was cancelled or withdrawn before it left (activeQuantity 0), so it isn't made at all. */
export type CheckInItem = { previewStatus: PreviewStatus | null; checkedInAt: string | Date | null; cancelled: boolean };
export type ItemStage = "in_pipeline" | "ready" | "checked" | "cancelled";

export const ITEM_READY_PREVIEW_STATUS: PreviewStatus = "PRINT_READY";

// Order statuses in which items can be ticked off, and that are still ours to finish.
export const OPEN_ORDER_STATUSES: OrderStatus[] = ["PAID", "IN_PRODUCTION"];

/** The copies of an order line still to make and send: an approved cancellation or early withdrawal takes some off. */
export const activeQuantity = (item: { quantity: number; cancelledQuantity: number }) => item.quantity - item.cancelledQuantity;

/** An order line as the check-in sees it, from what the database gives (or the order page's view of it). */
export function checkInItemOf(item: {
  checkedInAt: string | Date | null;
  quantity: number;
  cancelledQuantity: number;
  previewStatus?: PreviewStatus | null;
  preview?: { status: PreviewStatus } | null;
}): CheckInItem {
  return {
    previewStatus: item.preview?.status ?? item.previewStatus ?? null,
    checkedInAt: item.checkedInAt,
    cancelled: activeQuantity(item) <= 0,
  };
}

export function itemStage(item: CheckInItem): ItemStage {
  if (item.cancelled) return "cancelled";
  if (item.checkedInAt) return "checked";
  if (item.previewStatus && item.previewStatus !== ITEM_READY_PREVIEW_STATUS) return "in_pipeline";
  return "ready";
}

export function summarizeCheckIn(items: CheckInItem[]) {
  const stages = items.map(itemStage).filter((stage) => stage !== "cancelled");
  const count = (stage: ItemStage) => stages.filter((value) => value === stage).length;
  return { total: stages.length, checked: count("checked"), ready: count("ready"), inPipeline: count("in_pipeline") };
}

export type CheckInSummary = ReturnType<typeof summarizeCheckIn>;

/** Every item that is still made has been ticked off. An order with everything cancelled has nothing to send. */
export function allItemsCheckedIn(items: CheckInItem[]) {
  const stages = items.map(itemStage).filter((stage) => stage !== "cancelled");
  return stages.length > 0 && stages.every((stage) => stage === "checked");
}

/**
 * What the team does next for this order, in one line. With `batchStatus` (null = in no batch) the batch steps count
 * too: a print-ready order waits for a batch, then for JLC, and is checked in once the prints are back.
 */
export function nextStepLabel(
  status: OrderStatus,
  summary: CheckInSummary,
  { handover = false, batchStatus }: { handover?: boolean; batchStatus?: BatchStatus | null } = {},
) {
  if (status === "PENDING_PAYMENT") return "Wacht op betaling";
  if (!OPEN_ORDER_STATUSES.includes(status)) return "Niets meer te doen";
  if (summary.inPipeline > 0) {
    return summary.inPipeline === 1 ? "1 model nog in de pipeline" : `${summary.inPipeline} modellen nog in de pipeline`;
  }
  if (batchStatus === null && status === "PAID" && summary.checked === 0) return "Klaar voor een batch";
  if (batchStatus === "OPEN") return "In een batch, nog niet naar JLC";
  if (batchStatus === "SENT_TO_JLC") return "Bij JLC";
  if (summary.ready > 0) return summary.ready === 1 ? "1 item controleren en afvinken" : `${summary.ready} items controleren en afvinken`;
  return handover ? "Klaar om te overhandigen" : "Klaar om te verzenden";
}
