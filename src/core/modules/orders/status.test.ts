import { describe, expect, it } from "vitest";
import {
  assertOrderTransition,
  canTransitionOrder,
  InvalidOrderTransitionError,
  orderStatusesThatCanTransitionTo,
} from "./status";

describe("order status machine", () => {
  it("allows the payment outcomes from PENDING_PAYMENT", () => {
    expect(canTransitionOrder("PENDING_PAYMENT", "PAID")).toBe(true);
    expect(canTransitionOrder("PENDING_PAYMENT", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("PENDING_PAYMENT", "EXPIRED")).toBe(true);
  });

  it("never re-enters the same status (idempotent webhooks)", () => {
    for (const status of ["PENDING_PAYMENT", "PAID", "CANCELLED", "EXPIRED", "REFUNDED"] as const) {
      expect(canTransitionOrder(status, status)).toBe(false);
    }
  });

  it("records late payments on closed orders", () => {
    expect(canTransitionOrder("EXPIRED", "PAID")).toBe(true);
    expect(canTransitionOrder("CANCELLED", "PAID")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransitionOrder("PAID", "PENDING_PAYMENT")).toBe(false);
    expect(canTransitionOrder("PAID", "EXPIRED")).toBe(false);
    expect(canTransitionOrder("REFUNDED", "PAID")).toBe(false);
    expect(canTransitionOrder("SHIPPED", "IN_PRODUCTION")).toBe(false);
    expect(() => assertOrderTransition("PENDING_PAYMENT", "SHIPPED")).toThrow(InvalidOrderTransitionError);
  });

  it("lists the sources of a transition", () => {
    expect(orderStatusesThatCanTransitionTo("PAID").sort()).toEqual(["CANCELLED", "EXPIRED", "PENDING_PAYMENT"]);
    expect(orderStatusesThatCanTransitionTo("REFUNDED").sort()).toEqual(["IN_PRODUCTION", "PAID", "SHIPPED"]);
  });
});
