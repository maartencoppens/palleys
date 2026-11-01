import { describe, expect, it } from "vitest";
import { allItemsCheckedIn, itemStage, nextStepLabel, summarizeCheckIn } from "./check-in";

const collectible = { previewStatus: null, checkedInAt: null };
const modelling = { previewStatus: "MODEL_READY", checkedInAt: null } as const;
const printReady = { previewStatus: "PRINT_READY", checkedInAt: null } as const;
const checked = { previewStatus: "PRINT_READY", checkedInAt: new Date() } as const;

describe("order check-in", () => {
  it("lets a collectible through straight away, a personalised Palley only when it is print-ready", () => {
    expect(itemStage(collectible)).toBe("ready");
    expect(itemStage(modelling)).toBe("in_pipeline");
    expect(itemStage(printReady)).toBe("ready");
    expect(itemStage(checked)).toBe("checked");
  });

  it("only counts an order as complete when every item is ticked off", () => {
    expect(allItemsCheckedIn([checked, { previewStatus: null, checkedInAt: new Date() }])).toBe(true);
    expect(allItemsCheckedIn([checked, printReady])).toBe(false);
    expect(allItemsCheckedIn([])).toBe(false);
  });

  it("names the next step", () => {
    const label = (items: Parameters<typeof summarizeCheckIn>[0], options?: { handover?: boolean }) =>
      nextStepLabel("IN_PRODUCTION", summarizeCheckIn(items), options);
    expect(nextStepLabel("PENDING_PAYMENT", summarizeCheckIn([collectible]))).toBe("Wacht op betaling");
    expect(label([modelling, printReady])).toBe("1 model nog in de pipeline");
    expect(label([printReady, collectible])).toBe("2 items controleren en afvinken");
    expect(label([checked])).toBe("Klaar om te verzenden");
    expect(label([checked], { handover: true })).toBe("Klaar om te overhandigen");
    expect(nextStepLabel("SHIPPED", summarizeCheckIn([checked]))).toBe("Niets meer te doen");
  });
});
