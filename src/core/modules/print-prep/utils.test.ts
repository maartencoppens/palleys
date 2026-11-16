import { describe, expect, it } from "vitest";
import { matchProcessedFiles } from "./utils";

const items = [
  { id: "a", baseName: "PAL-PLY1042-01-P-RING-KAT" },
  { id: "b", baseName: "PAL-PLY1042-01-P-RING-KAT-R1" },
  { id: "c", baseName: "PAL-PLY1043-02-P-FIG-HOND" },
];

describe("matchProcessedFiles", () => {
  it("matches on the print name, with or without a suffix", () => {
    const result = matchProcessedFiles(
      ["PAL-PLY1042-01-P-RING-KAT.zip", "pal-ply1043-02-p-fig-hond_print.zip", "PAL-PLY1042-01-P-RING-KAT-R1 (1).zip", "PAL-PLY1042-01-P-RING-KAT-final.zip"],
      items,
    );
    expect(result.map((match) => match.item?.id)).toEqual(["a", "c", "b", "a"]);
  });

  it("never puts a reprint on the first print, or a longer number on a shorter one", () => {
    const result = matchProcessedFiles(["PAL-PLY1042-01-P-RING-KAT-R2.zip", "PAL-PLY1043-02-P-FIG-HONDJE.zip", "random.zip"], items);
    expect(result.map((match) => match.item)).toEqual([null, null, null]);
  });
});
