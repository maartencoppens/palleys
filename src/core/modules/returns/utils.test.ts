import { describe, expect, it } from "vitest";
import {
  addWorkingDays,
  allowedQuantity,
  brusselsDay,
  cancelsProduction,
  isReturnPhotoKeyOf,
  itemReturnOptions,
  itemReturnStatus,
  normalizeOrderNumber,
  receivedOn,
  sameEmail,
  withdrawalDeadline,
  withoutAttentionNote,
  type ReturnRulesItem,
  type ReturnRulesOrder,
} from "./utils";

// A Monday. Posted then, a parcel counts as received on Wednesday 11 November.
const POSTED = new Date("2026-11-09T10:00:00Z");
const parcel = { deliveryType: "HOME", shippedAt: POSTED, deliveredAt: null };

const order = (overrides: Partial<ReturnRulesOrder> = {}): ReturnRulesOrder => ({
  status: "PAID",
  productionStarted: false,
  isReprint: false,
  shipment: parcel,
  ...overrides,
});
const custom = (overrides: Partial<ReturnRulesItem> = {}): ReturnRulesItem => ({ withdrawable: false, quantity: 1, requests: [], ...overrides });
const collectible = (overrides: Partial<ReturnRulesItem> = {}): ReturnRulesItem => ({ withdrawable: true, quantity: 2, requests: [], ...overrides });
const shipped = order({ status: "SHIPPED" });

describe("calendar days", () => {
  it("counts in Brussels time", () => {
    expect(brusselsDay(new Date("2026-11-09T23:30:00Z"))).toBe("2026-11-10");
    expect(brusselsDay(new Date("2026-07-01T21:59:00Z"))).toBe("2026-07-01");
    expect(brusselsDay(new Date("2026-07-01T22:00:00Z"))).toBe("2026-07-02");
  });

  it("skips the weekend for working days", () => {
    expect(addWorkingDays("2026-11-09", 2)).toBe("2026-11-11"); // Monday → Wednesday
    expect(addWorkingDays("2026-11-12", 2)).toBe("2026-11-16"); // Thursday → Monday
    expect(addWorkingDays("2026-11-14", 1)).toBe("2026-11-16"); // Saturday → Monday
  });

  it("ends the withdrawal period on the 14th day after receipt", () => {
    expect(withdrawalDeadline("2026-11-11")).toBe("2026-11-25");
    expect(withdrawalDeadline("2026-12-25")).toBe("2027-01-08");
  });
});

describe("when the customer received the order", () => {
  it("estimates a parcel from the day it was posted", () => {
    expect(receivedOn(parcel)).toEqual({ day: "2026-11-11", estimated: true });
  });

  it("takes the date the team filled in", () => {
    expect(receivedOn({ ...parcel, deliveredAt: new Date("2026-11-13T12:00:00Z") })).toEqual({ day: "2026-11-13", estimated: false });
  });

  it("knows the day of a pickup or handover exactly", () => {
    expect(receivedOn({ deliveryType: "PICKUP", shippedAt: POSTED, deliveredAt: null })).toEqual({ day: "2026-11-09", estimated: false });
    expect(receivedOn({ deliveryType: "HANDOVER", shippedAt: POSTED, deliveredAt: null })?.estimated).toBe(false);
  });

  it("doesn't know it for an order that never left", () => {
    expect(receivedOn(null)).toBeNull();
    expect(receivedOn({ ...parcel, shippedAt: null })).toBeNull();
  });
});

describe("a Palley op maat", () => {
  it("can be cancelled for free until it goes into production", () => {
    const options = itemReturnOptions(order(), custom(), "2026-11-09");
    expect(options).toMatchObject({ cancel: 1, withdraw: 0, warranty: 0, notices: [] });
  });

  it("can't be cancelled any more once a pose was approved, even before the batch", () => {
    const options = itemReturnOptions(order({ productionStarted: true }), custom(), "2026-11-09");
    expect(options.cancel).toBe(0);
    expect(options.notices).toContain("custom_no_withdrawal");
    // A collectible in the same order can still be withdrawn.
    expect(itemReturnOptions(order({ productionStarted: true }), collectible(), "2026-11-09").withdraw).toBe(2);
  });

  it("has no right of withdrawal once in production, and says why", () => {
    for (const status of ["IN_PRODUCTION", "SHIPPED"] as const) {
      const options = itemReturnOptions(order({ status }), custom(), "2026-11-12");
      expect(options.cancel + options.withdraw).toBe(0);
      expect(options.notices).toContain("custom_no_withdrawal");
    }
  });

  it("falls under the guarantee once it arrived", () => {
    expect(itemReturnOptions(shipped, custom(), "2026-11-12").warranty).toBe(1);
    expect(itemReturnOptions(order({ status: "IN_PRODUCTION" }), custom(), "2026-11-12").warranty).toBe(0);
  });
});

describe("a Palley uit onze collectie", () => {
  it("can be withdrawn before it leaves: full refund, nothing to send back", () => {
    for (const status of ["PAID", "IN_PRODUCTION"] as const) {
      expect(itemReturnOptions(order({ status }), collectible(), "2026-11-09")).toMatchObject({ withdraw: 2, withdrawalReceived: false, cancel: 0 });
    }
  });

  it("can be withdrawn up to and including the 14th day after receipt, then sent back", () => {
    expect(itemReturnOptions(shipped, collectible(), "2026-11-25")).toMatchObject({
      withdraw: 2,
      withdrawalReceived: true,
      withdrawalDeadline: "2026-11-25",
    });
    const late = itemReturnOptions(shipped, collectible(), "2026-11-26");
    expect(late.withdraw).toBe(0);
    expect(late.notices).toContain("withdrawal_expired");
    expect(late.warranty).toBe(2);
  });

  it("counts from the real delivery date when the team filled it in", () => {
    const later = order({ status: "SHIPPED", shipment: { ...parcel, deliveredAt: new Date("2026-11-20T12:00:00Z") } });
    expect(itemReturnOptions(later, collectible(), "2026-12-04").withdraw).toBe(2);
    expect(itemReturnOptions(later, collectible(), "2026-12-05").withdraw).toBe(0);
  });

  it("keeps the period open when the receipt date is unknown", () => {
    const unknown = order({ status: "SHIPPED", shipment: { ...parcel, shippedAt: null } });
    expect(itemReturnOptions(unknown, collectible(), "2030-01-01")).toMatchObject({ withdraw: 2, withdrawalDeadline: null });
  });

  it("only offers what isn't withdrawn yet, and everything again after a rejection", () => {
    const requests = [{ type: "WITHDRAWAL", status: "SUBMITTED", quantity: 1 }] as ReturnRulesItem["requests"];
    expect(itemReturnOptions(order(), collectible({ requests }), "2026-11-09").withdraw).toBe(1);
    const all = [{ type: "WITHDRAWAL", status: "APPROVED", quantity: 2 }] as ReturnRulesItem["requests"];
    expect(itemReturnOptions(order(), collectible({ requests: all }), "2026-11-09")).toMatchObject({ withdraw: 0, notices: ["request_open"] });
    const rejected = [{ type: "WITHDRAWAL", status: "REJECTED", quantity: 2 }] as ReturnRulesItem["requests"];
    expect(itemReturnOptions(order(), collectible({ requests: rejected }), "2026-11-09").withdraw).toBe(2);
  });
});

describe("the guarantee", () => {
  it("lasts 2 years from receipt", () => {
    expect(itemReturnOptions(shipped, custom(), "2028-11-11").warranty).toBe(1);
    const expired = itemReturnOptions(shipped, custom(), "2028-11-12");
    expect(expired.warranty).toBe(0);
    expect(expired.notices).toContain("warranty_expired");
  });

  it("allows one open claim per copy; a finished one frees it again", () => {
    const open = [{ type: "WARRANTY", status: "APPROVED", quantity: 1 }] as ReturnRulesItem["requests"];
    expect(itemReturnOptions(shipped, custom({ requests: open }), "2026-11-12").warranty).toBe(0);
    const done = [{ type: "WARRANTY", status: "COMPLETED", quantity: 1 }] as ReturnRulesItem["requests"];
    expect(itemReturnOptions(shipped, custom({ requests: done }), "2026-11-12").warranty).toBe(1);
  });

  it("is all a reprint gets: it's a replacement, not a new purchase", () => {
    expect(itemReturnOptions(order({ isReprint: true }), custom(), "2026-11-09").cancel).toBe(0);
    expect(itemReturnOptions(order({ status: "SHIPPED", isReprint: true }), collectible(), "2026-11-12")).toMatchObject({ withdraw: 0, warranty: 2 });
  });
});

describe("a refunded order", () => {
  it("allows nothing", () => {
    const options = itemReturnOptions(order({ status: "REFUNDED" }), collectible(), "2026-11-09");
    expect(allowedQuantity(options, "WITHDRAWAL") + allowedQuantity(options, "WARRANTY") + allowedQuantity(options, "CANCELLATION")).toBe(0);
    expect(options.notices).toEqual(["refunded"]);
  });
});

describe("item status for the customer", () => {
  const base = { quantity: 1, cancelledQuantity: 0, requests: [] };
  it("puts a running request first, then a cancellation, then the order", () => {
    expect(itemReturnStatus(shipped, { ...base, requests: [{ type: "WARRANTY", status: "SUBMITTED", quantity: 1 }] })).toBe("request_open");
    expect(itemReturnStatus(order(), { ...base, cancelledQuantity: 1 })).toBe("cancelled");
    expect(itemReturnStatus(shipped, base)).toBe("sent");
    expect(itemReturnStatus(order({ status: "SHIPPED", shipment: { ...parcel, deliveryType: "PICKUP" } }), base)).toBe("picked_up");
    expect(itemReturnStatus(order({ status: "IN_PRODUCTION" }), base)).toBe("in_production");
    expect(itemReturnStatus(order({ productionStarted: true }), base)).toBe("in_production");
    expect(itemReturnStatus(order(), base)).toBe("paid");
  });
});

describe("small helpers", () => {
  it("only stops production for a cancellation or a withdrawal before shipping", () => {
    expect(cancelsProduction("CANCELLATION", false)).toBe(true);
    expect(cancelsProduction("WITHDRAWAL", false)).toBe(true);
    expect(cancelsProduction("WITHDRAWAL", true)).toBe(false);
    expect(cancelsProduction("WARRANTY", false)).toBe(false);
  });

  it("reads an order number and an e-mail address the way people type them", () => {
    expect(normalizeOrderNumber(" ply 1042 ")).toBe("PLY1042");
    expect(sameEmail("Jan@Example.be ", "jan@example.be")).toBe(true);
    expect(sameEmail(null, "jan@example.be")).toBe(false);
  });

  it("takes only its own note off the attention reason", () => {
    expect(withoutAttentionNote("A | Retouraanvraag 1: X | B", "Retouraanvraag 1: X")).toBe("A | B");
    expect(withoutAttentionNote("Retouraanvraag 1: X", "Retouraanvraag 1: X")).toBeNull();
    expect(withoutAttentionNote(null, "x")).toBeNull();
  });

  it("only accepts photo keys under the order's own folder", () => {
    const orderId = "4c1f6a3e-1b2c-4d5e-8f90-123456789abc";
    const key = `returns/${orderId}/0f8a2c4e-1b2c-4d5e-8f90-abcdefabcdef.jpg`;
    expect(isReturnPhotoKeyOf("returns", orderId, key)).toBe(true);
    expect(isReturnPhotoKeyOf("returns", "other", key)).toBe(false);
    expect(isReturnPhotoKeyOf("returns", orderId, `previews/${orderId}/x.jpg`)).toBe(false);
    expect(isReturnPhotoKeyOf("returns", orderId, `returns/${orderId}/../secret.jpg`)).toBe(false);
  });
});
