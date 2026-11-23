import { describe, expect, it } from "vitest";
import { normalizeAddons } from "@/data/addons";
import { DEFAULT_ADDON_PROMPTS } from "@/data/prompts";
import { posePrompt } from "@/core/modules/previews/utils";
import { addonPrompts, addonsPriceCents, titleWithAddons } from "./utils";

describe("extras on a Palley", () => {
  it("keeps known extras only, once each", () => {
    expect(normalizeAddons(["santa-hat", "unicorn-horn", "santa-hat"])).toEqual(["santa-hat"]);
    expect(normalizeAddons(null)).toEqual([]);
  });

  it("adds their price from the season settings, free when not set", () => {
    expect(addonsPriceCents(["santa-hat"], { "santa-hat": 300 })).toBe(300);
    expect(addonsPriceCents(["santa-hat"], {})).toBe(0);
    expect(addonsPriceCents([], { "santa-hat": 300 })).toBe(0);
  });

  it("names them in the title", () => {
    expect(titleWithAddons("Palley Hond · Met sleutelhanger · Klemmetje", ["santa-hat"])).toBe(
      "Palley Hond · Met sleutelhanger · Klemmetje · Met kerstmuts",
    );
    expect(titleWithAddons("Palley Kat · Enkel figuurtje", [])).toBe("Palley Kat · Enkel figuurtje");
  });

  it("puts their prompt after the animal's, falling back to the starting text", () => {
    expect(addonPrompts(["santa-hat"], { addons: {} })).toEqual([DEFAULT_ADDON_PROMPTS["santa-hat"]]);
    expect(addonPrompts(["santa-hat"], { addons: { "santa-hat": "  Own hat text " } })).toEqual(["Own hat text"]);
    const prompts = { base: "Base", animals: { HOND: "Dog prompt" }, addons: {} };
    expect(posePrompt(prompts, "HOND")).toBe("Dog prompt");
    expect(posePrompt(prompts, "HOND", ["santa-hat"])).toBe(`Dog prompt\n\n${DEFAULT_ADDON_PROMPTS["santa-hat"]}`);
    expect(posePrompt(prompts, null, ["santa-hat"]).startsWith("Base\n\n")).toBe(true);
  });
});
