import { describe, expect, it } from "vitest";
import { assertReturnTransition, canTransitionReturn, InvalidReturnTransitionError, isReturnOpen } from "./status";

describe("return request status machine", () => {
  it("goes from submitted to approved or rejected, and from approved to completed", () => {
    expect(canTransitionReturn("SUBMITTED", "APPROVED")).toBe(true);
    expect(canTransitionReturn("SUBMITTED", "REJECTED")).toBe(true);
    expect(canTransitionReturn("APPROVED", "COMPLETED")).toBe(true);
  });

  it("never skips the decision and never reopens", () => {
    expect(canTransitionReturn("SUBMITTED", "COMPLETED")).toBe(false);
    expect(canTransitionReturn("REJECTED", "APPROVED")).toBe(false);
    expect(canTransitionReturn("COMPLETED", "SUBMITTED")).toBe(false);
    expect(() => assertReturnTransition("APPROVED", "REJECTED")).toThrow(InvalidReturnTransitionError);
  });

  it("counts submitted and approved requests as still open", () => {
    expect(isReturnOpen("SUBMITTED")).toBe(true);
    expect(isReturnOpen("APPROVED")).toBe(true);
    expect(isReturnOpen("REJECTED")).toBe(false);
    expect(isReturnOpen("COMPLETED")).toBe(false);
  });
});
