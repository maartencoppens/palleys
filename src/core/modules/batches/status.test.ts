import { describe, expect, it } from "vitest";
import { assertBatchTransition, canCheckInInBatch, canTransitionBatch, isBatchEditable, shouldComplete } from "./status";

describe("batch transitions", () => {
  it("only moves forward, one step at a time", () => {
    expect(canTransitionBatch("OPEN", "SENT_TO_JLC")).toBe(true);
    expect(canTransitionBatch("SENT_TO_JLC", "IN_POST_PRODUCTION")).toBe(true);
    expect(canTransitionBatch("IN_POST_PRODUCTION", "COMPLETED")).toBe(true);
  });

  it("refuses skipping, going back and leaving COMPLETED", () => {
    expect(canTransitionBatch("OPEN", "IN_POST_PRODUCTION")).toBe(false);
    expect(canTransitionBatch("OPEN", "COMPLETED")).toBe(false);
    expect(canTransitionBatch("SENT_TO_JLC", "OPEN")).toBe(false);
    expect(canTransitionBatch("COMPLETED", "IN_POST_PRODUCTION")).toBe(false);
    expect(canTransitionBatch("OPEN", "OPEN")).toBe(false);
    expect(() => assertBatchTransition("SENT_TO_JLC", "COMPLETED")).toThrow();
  });

  it("can only be edited before it goes to JLC", () => {
    expect(isBatchEditable("OPEN")).toBe(true);
    expect(isBatchEditable("SENT_TO_JLC")).toBe(false);
    expect(isBatchEditable("IN_POST_PRODUCTION")).toBe(false);
  });
});

describe("automatic completion", () => {
  it("completes once every order shipped, was picked up or refunded", () => {
    expect(shouldComplete("IN_POST_PRODUCTION", ["SHIPPED", "SHIPPED"])).toBe(true);
    expect(shouldComplete("IN_POST_PRODUCTION", ["SHIPPED", "REFUNDED"])).toBe(true);
  });

  it("waits while an order is still open, and never before post-production", () => {
    expect(shouldComplete("IN_POST_PRODUCTION", ["SHIPPED", "IN_PRODUCTION"])).toBe(false);
    expect(shouldComplete("IN_POST_PRODUCTION", [])).toBe(false);
    expect(shouldComplete("SENT_TO_JLC", ["SHIPPED"])).toBe(false);
  });
});

describe("check-in in a batch", () => {
  it("waits until the prints are back", () => {
    expect(canCheckInInBatch(null)).toBe(true);
    expect(canCheckInInBatch("IN_POST_PRODUCTION")).toBe(true);
    expect(canCheckInInBatch("OPEN")).toBe(false);
    expect(canCheckInInBatch("SENT_TO_JLC")).toBe(false);
  });
});
