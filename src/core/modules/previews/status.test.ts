import { describe, expect, it } from "vitest";
import { canTransition, statusesThatCanTransitionTo } from "./status";

describe("preview transitions for an uploaded pose", () => {
  it("lands on pose ready from a paid, failed or modelled preview", () => {
    expect(statusesThatCanTransitionTo("POSE_READY").sort()).toEqual(["FAILED", "GENERATING_POSE", "MODEL_READY", "PAID"]);
  });

  it("never skips approving a pose: nothing goes from paid straight to the 3D model", () => {
    expect(canTransition("PAID", "GENERATING_MODEL")).toBe(false);
    expect(canTransition("UPLOADED", "POSE_READY")).toBe(false);
  });

  it("can't change the pose once the model is approved", () => {
    expect(canTransition("APPROVED", "POSE_READY")).toBe(false);
    expect(canTransition("PRINT_READY", "POSE_READY")).toBe(false);
  });
});
