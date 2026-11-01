import type { OrderStatus, PreviewStatus } from "@/db/generated/enums";

/*
 * The human check before an order leaves: every item is looked at and ticked off by an admin. A personalised Palley
 * first has to get through the pipeline (Te reviewen → Goedgekeurd → Processed); a collectible can be ticked off
 * straight away. Pure, so the order page, the dashboard and the server all apply the same rules.
 */

export type CheckInItem = { previewStatus: PreviewStatus | null; checkedInAt: string | Date | null };
export type ItemStage = "in_pipeline" | "ready" | "checked";

export const ITEM_READY_PREVIEW_STATUS: PreviewStatus = "PRINT_READY";

// Order statuses in which items can be ticked off, and that are still ours to finish.
export const OPEN_ORDER_STATUSES: OrderStatus[] = ["PAID", "IN_PRODUCTION"];

export function itemStage(item: CheckInItem): ItemStage {
  if (item.checkedInAt) return "checked";
  if (item.previewStatus && item.previewStatus !== ITEM_READY_PREVIEW_STATUS) return "in_pipeline";
  return "ready";
}

export function summarizeCheckIn(items: CheckInItem[]) {
  const stages = items.map(itemStage);
  const count = (stage: ItemStage) => stages.filter((value) => value === stage).length;
  return { total: items.length, checked: count("checked"), ready: count("ready"), inPipeline: count("in_pipeline") };
}

export type CheckInSummary = ReturnType<typeof summarizeCheckIn>;

export function allItemsCheckedIn(items: CheckInItem[]) {
  return items.length > 0 && items.every((item) => itemStage(item) === "checked");
}

/** What the team does next for this order, in one line. */
export function nextStepLabel(status: OrderStatus, summary: CheckInSummary, { handover = false } = {}) {
  if (status === "PENDING_PAYMENT") return "Wacht op betaling";
  if (!OPEN_ORDER_STATUSES.includes(status)) return "Niets meer te doen";
  if (summary.inPipeline > 0) {
    return summary.inPipeline === 1 ? "1 model nog in de pipeline" : `${summary.inPipeline} modellen nog in de pipeline`;
  }
  if (summary.ready > 0) return summary.ready === 1 ? "1 item controleren en afvinken" : `${summary.ready} items controleren en afvinken`;
  return handover ? "Klaar om te overhandigen" : "Klaar om te verzenden";
}
