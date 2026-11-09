import { describe, expect, it } from "vitest";
import { finishedOn, photosAreDue, printModelIsDue, type RetentionOrder } from "./utils";

// Picked up on Monday 9 November 2026: 6 weeks later is 21 December, 2 years later 9 November 2028.
const pickedUp: RetentionOrder = {
  status: "SHIPPED",
  photoMarketingConsent: false,
  shipment: { deliveryType: "PICKUP", shippedAt: new Date("2026-11-09T10:00:00Z"), deliveredAt: null },
  refundedAt: null,
};

describe("retention", () => {
  it("counts from receipt, or from the refund", () => {
    expect(finishedOn(pickedUp)).toBe("2026-11-09");
    expect(finishedOn({ ...pickedUp, shipment: { ...pickedUp.shipment!, deliveryType: "HOME" } })).toBe("2026-11-11");
    expect(finishedOn({ ...pickedUp, status: "REFUNDED", refundedAt: new Date("2026-11-20T10:00:00Z") })).toBe("2026-11-20");
    expect(finishedOn({ ...pickedUp, status: "IN_PRODUCTION" })).toBeNull();
  });

  it("deletes photos 6 weeks after receipt, not a day earlier", () => {
    expect(photosAreDue([pickedUp], "2026-12-21")).toBe(false);
    expect(photosAreDue([pickedUp], "2026-12-22")).toBe(true);
  });

  it("keeps the photos while the customer allows marketing with them", () => {
    expect(photosAreDue([{ ...pickedUp, photoMarketingConsent: true }], "2030-01-01")).toBe(false);
  });

  it("waits for the last order of a preview, like a reprint still on its way", () => {
    const reprint = { ...pickedUp, status: "PAID" as const, shipment: { ...pickedUp.shipment!, shippedAt: null } };
    expect(photosAreDue([pickedUp, reprint], "2027-06-01")).toBe(false);
    const reprintPickedUp = { ...pickedUp, shipment: { ...pickedUp.shipment!, shippedAt: new Date("2027-01-15T10:00:00Z") } };
    expect(photosAreDue([pickedUp, reprintPickedUp], "2027-02-01")).toBe(false);
    expect(photosAreDue([pickedUp, reprintPickedUp], "2027-02-27")).toBe(true);
  });

  it("keeps the print model for the 2 years of the guarantee", () => {
    expect(printModelIsDue([pickedUp], "2028-11-09")).toBe(false);
    expect(printModelIsDue([pickedUp], "2028-11-10")).toBe(true);
    // Consent is about the photos, not the model.
    expect(printModelIsDue([{ ...pickedUp, photoMarketingConsent: true }], "2028-11-10")).toBe(true);
  });

  it("does nothing without a paid order", () => {
    expect(photosAreDue([], "2030-01-01")).toBe(false);
    expect(printModelIsDue([], "2030-01-01")).toBe(false);
  });
});
