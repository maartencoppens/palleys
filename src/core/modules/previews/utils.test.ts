import { describe, expect, it } from "vitest";
import { DEFAULT_ANIMAL_PROMPTS, POSE_PROMPT } from "@/data/prompts";
import { linkPrintFiles, posePrompt, printBaseName, type PrintNameSource } from "./utils";

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

const PREVIEW_ID = "a3f9c2e1-0b4d-4c3a-9e2f-1234567890ab";
const source = (overrides: Partial<PrintNameSource> = {}): PrintNameSource => ({
  id: PREVIEW_ID,
  forCollectible: false,
  collectible: null,
  orderItems: [],
  ...overrides,
});

describe("print names", () => {
  it("names a paid Palley after its order line", () => {
    const item = { position: 1, productCode: "P-RING-KAT", reprintNr: 0, order: { number: "PLY1042" } };
    expect(printBaseName(source({ orderItems: [item] }))).toBe("PAL-PLY1042-01-P-RING-KAT");
    expect(printBaseName(source({ orderItems: [{ ...item, position: 2, reprintNr: 1 }] }))).toBe("PAL-PLY1042-02-P-RING-KAT-R1");
  });

  it("falls back to the preview without a paid order, or one from before the standard", () => {
    expect(printBaseName(source())).toBe("PRV-A3F9C2E1");
    const legacy = { position: 1, productCode: "PAL-GP-KEY-KAT", reprintNr: 0, order: { number: "PAL-2026-00042" } };
    expect(printBaseName(source({ orderItems: [legacy] }))).toBe("PRV-A3F9C2E1");
  });

  it("names a new collectible's model after the collectible", () => {
    expect(printBaseName(source({ forCollectible: true, collectible: { number: 7, animalCode: "HOND" } }))).toBe("COL-007-HOND");
    expect(printBaseName(source({ forCollectible: true, collectible: { number: 7, animalCode: null } }))).toBe("PRV-A3F9C2E1");
  });
});

describe("linkPrintFiles", () => {
  const baseName = "PAL-PLY1042-01-P-RING-KAT";
  const obj = "# Meshy\nmtllib model-task123.mtl\nv 0 0 0\n";
  const mtl = "newmtl material_0\nmap_Kd model-task123_0.png\nmap_Bump model-task123_normal.png\n";

  it("points the OBJ and MTL at the renamed files", () => {
    const linked = linkPrintFiles({ obj, mtl, baseName });
    expect(linked.obj).toContain(`mtllib ${baseName}.mtl`);
    expect(linked.obj).not.toContain("model-task123");
    expect(linked.mtl).toContain(`map_Kd ${baseName}.png`);
    expect(linked.mtl).not.toContain("map_Bump");
  });

  it("adds the mtllib line when Meshy left it out", () => {
    expect(linkPrintFiles({ obj: "v 0 0 0\n", mtl, baseName }).obj.startsWith(`mtllib ${baseName}.mtl\n`)).toBe(true);
  });
});
