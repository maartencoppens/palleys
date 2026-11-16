import { describe, expect, it } from "vitest";
import { currentOrderStep, reachableOrderSteps } from "./steps";

describe("order steps set by hand", () => {
  it("knows where an order is from its status and its batch", () => {
    expect(currentOrderStep("PAID", null)).toBeNull();
    expect(currentOrderStep("PAID", "OPEN")).toBe("BATCH");
    expect(currentOrderStep("IN_PRODUCTION", "SENT_TO_JLC")).toBe("AT_JLC");
    expect(currentOrderStep("IN_PRODUCTION", "IN_POST_PRODUCTION")).toBe("POST_PRODUCTION");
    expect(currentOrderStep("SHIPPED", "COMPLETED")).toBe("FINISHED");
  });

  it("only goes forward", () => {
    expect(reachableOrderSteps("PAID", null)).toEqual(["BATCH", "AT_JLC", "POST_PRODUCTION", "FINISHED"]);
    expect(reachableOrderSteps("PAID", "OPEN")).toEqual(["AT_JLC", "POST_PRODUCTION", "FINISHED"]);
    expect(reachableOrderSteps("IN_PRODUCTION", "IN_POST_PRODUCTION")).toEqual(["FINISHED"]);
  });

  it("never for an unpaid or finished order", () => {
    expect(reachableOrderSteps("PENDING_PAYMENT", null)).toEqual([]);
    expect(reachableOrderSteps("SHIPPED", "COMPLETED")).toEqual([]);
    expect(reachableOrderSteps("REFUNDED", null)).toEqual([]);
  });

  it("doesn't put an order that is in production without a batch into an open one", () => {
    expect(reachableOrderSteps("IN_PRODUCTION", null)).toEqual(["AT_JLC", "POST_PRODUCTION", "FINISHED"]);
  });
});
