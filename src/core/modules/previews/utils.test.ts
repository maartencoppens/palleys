import { describe, expect, it } from "vitest";
import { DEFAULT_ANIMAL_PROMPTS, POSE_PROMPT } from "@/data/prompts";
import { posePrompt } from "./utils";

describe("pose prompt", () => {
  const prompts = { base: POSE_PROMPT, animals: DEFAULT_ANIMAL_PROMPTS };

  it("is the animal's own full prompt", () => {
    expect(posePrompt(prompts, "KONIJN")).toBe(DEFAULT_ANIMAL_PROMPTS.KONIJN);
    expect(posePrompt(prompts, "KONIJN")).toContain("no visible tail");
  });

  it("is the general prompt for an animal without one of its own, or without an animal", () => {
    expect(posePrompt(prompts, null)).toBe(POSE_PROMPT.trim());
    expect(posePrompt(prompts, "PAPEGAAI")).toBe(POSE_PROMPT.trim());
    expect(posePrompt({ ...prompts, animals: { ...DEFAULT_ANIMAL_PROMPTS, KAT: "  " } }, "KAT")).toBe(POSE_PROMPT.trim());
  });
});
