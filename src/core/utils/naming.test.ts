import { describe, expect, it } from "vitest";
import type { Attachment, Edition } from "@/data/options";
import {
  batchManifestEntry,
  batchRef,
  batchZipEntry,
  batchZipName,
  bpostCsvName,
  collectibleId,
  downloadZipName,
  editionCode,
  invoiceNumber,
  isOrderRef,
  orderRef,
  palleyFileName,
  palleyName,
  parseBatchRef,
  parseCollectibleId,
  parseInvoiceNumber,
  parseOrderRef,
  parsePalleyFileName,
  parsePalleyName,
  parsePreviewRef,
  parseProductCode,
  previewRef,
  productCode,
  type ProductCodeInput,
} from "./naming";

const PREVIEW_ID = "a3f9c2e1-0b4d-4c3a-9e2f-1234567890ab";

describe("order numbers", () => {
  it("pads to four digits and grows beyond", () => {
    expect(orderRef(1042)).toBe("PLY1042");
    expect(orderRef(7)).toBe("PLY0007");
    expect(orderRef(12345)).toBe("PLY12345");
  });

  it("stays within 12 characters for bpost and Bancontact", () => {
    expect(orderRef(999_999_999)).toHaveLength(12);
    expect(() => orderRef(1_000_000_000)).toThrow();
  });

  it("rejects invalid sequences", () => {
    for (const seq of [0, -1, 1.5, Number.NaN]) expect(() => orderRef(seq)).toThrow();
  });

  it("reads back only what it makes", () => {
    expect(parseOrderRef("PLY1042")).toBe(1042);
    expect(parseOrderRef(orderRef(7))).toBe(7);
    for (const value of ["PLY00042", "ply1042", "PLY 1042", "PLY-1042", "PAL-2026-00042", "PLY"]) {
      expect(parseOrderRef(value)).toBeNull();
    }
  });

  it("recognises old numbers too", () => {
    expect(isOrderRef("PLY1042")).toBe(true);
    expect(isOrderRef("PAL-2026-00042")).toBe(true);
    expect(isOrderRef("1042")).toBe(false);
    expect(isOrderRef("PAL-PLY1042-01-P-RING-KAT")).toBe(false);
  });
});

describe("invoice numbers", () => {
  it("counts per year with four digits", () => {
    expect(invoiceNumber(2026, 1)).toBe("F2026-0001");
    expect(invoiceNumber(2027, 12345)).toBe("F2027-12345");
  });

  it("round-trips and rejects nonsense", () => {
    expect(parseInvoiceNumber(invoiceNumber(2026, 42))).toEqual({ year: 2026, seq: 42 });
    expect(parseInvoiceNumber("F2026-1")).toBeNull();
    expect(parseInvoiceNumber("f2026-0001")).toBeNull();
    expect(() => invoiceNumber(26, 1)).toThrow();
    expect(() => invoiceNumber(2026, 0)).toThrow();
  });
});

describe("preview refs", () => {
  it("takes the start of the id in capitals", () => {
    expect(previewRef(PREVIEW_ID)).toBe("PRV-A3F9C2E1");
    expect(parsePreviewRef(previewRef(PREVIEW_ID))).toBe("a3f9c2e1");
  });

  it("rejects what isn't a preview", () => {
    expect(() => previewRef("not-a-uuid")).toThrow();
    expect(parsePreviewRef("PRV-a3f9c2e1")).toBeNull();
    expect(parsePreviewRef("PRV-A3F9")).toBeNull();
  });
});

describe("edition codes", () => {
  it("maps figure, clip and key ring", () => {
    expect(editionCode({ edition: "figure", attachment: null })).toBe("FIG");
    expect(editionCode({ edition: "keychain", attachment: "clip" })).toBe("CLP");
    expect(editionCode({ edition: "keychain", attachment: "key-ring" })).toBe("RING");
  });

  it("refuses combinations that don't exist", () => {
    expect(() => editionCode({ edition: "figure", attachment: "clip" })).toThrow();
    expect(() => editionCode({ edition: "keychain", attachment: null })).toThrow();
    expect(() => editionCode({ edition: "mug" as Edition, attachment: null })).toThrow();
    expect(() => editionCode({ edition: "keychain", attachment: "magnet" as Attachment })).toThrow();
  });
});

describe("product codes", () => {
  it("names a personalised Palley by edition and animal", () => {
    expect(productCode({ kind: "P", edition: "keychain", attachment: "key-ring", animalCode: "KAT" })).toBe("P-RING-KAT");
    expect(productCode({ kind: "P", edition: "figure", attachment: null, animalCode: "PAPEGAAI2" })).toBe("P-FIG-PAPEGAAI2");
  });

  it("names a collectible by edition and number", () => {
    expect(productCode({ kind: "COL", edition: "keychain", attachment: "clip", collectibleNr: 7 })).toBe("COL-CLP-007");
    expect(productCode({ kind: "COL", edition: "figure", attachment: null, collectibleNr: 1234 })).toBe("COL-FIG-1234");
  });

  it("round-trips", () => {
    const inputs: ProductCodeInput[] = [
      { kind: "P", edition: "keychain", attachment: "clip", animalCode: "HOND" },
      { kind: "P", edition: "figure", attachment: null, animalCode: "CAVIA" },
      { kind: "COL", edition: "keychain", attachment: "key-ring", collectibleNr: 7 },
    ];
    for (const input of inputs) expect(parseProductCode(productCode(input))).toEqual(input);
  });

  it("rejects invalid input", () => {
    expect(() => productCode({ kind: "P", edition: "keychain", attachment: "clip", animalCode: "kat" })).toThrow();
    expect(() => productCode({ kind: "P", edition: "keychain", attachment: "clip", animalCode: "KAT HOND" })).toThrow();
    expect(() => productCode({ kind: "P", edition: "keychain", attachment: "clip", animalCode: "" })).toThrow();
    expect(() => productCode({ kind: "COL", edition: "keychain", attachment: "clip", collectibleNr: -1 })).toThrow();
    for (const value of ["P-KEY-KAT", "PAL-GP-KEY-HOND", "COL-CLP-07", "COL-CLP-HOND", "p-ring-kat", "P-FIG-KAT-"]) {
      expect(parseProductCode(value)).toBeNull();
    }
  });
});

describe("collectible ids", () => {
  it("pads the number and adds the animal", () => {
    expect(collectibleId(7, "HOND")).toBe("COL-007-HOND");
    expect(parseCollectibleId("COL-007-HOND")).toEqual({ collectibleNr: 7, animalCode: "HOND" });
  });

  it("rejects invalid input", () => {
    expect(() => collectibleId(0, "HOND")).toThrow();
    expect(() => collectibleId(7, "Hond")).toThrow();
    expect(parseCollectibleId("COL-7-HOND")).toBeNull();
    expect(parseCollectibleId("COL-CLP-007")).toBeNull();
  });
});

describe("Palley names", () => {
  it("joins order, position and product code", () => {
    expect(palleyName({ orderRef: "PLY1042", index: 1, productCode: "P-RING-KAT" })).toBe("PAL-PLY1042-01-P-RING-KAT");
    expect(palleyName({ orderRef: "PLY1042", index: 2, productCode: "COL-CLP-007" })).toBe("PAL-PLY1042-02-COL-CLP-007");
  });

  it("marks a reprint", () => {
    expect(palleyName({ orderRef: "PLY1042", index: 1, productCode: "P-RING-KAT", reprintNr: 1 })).toBe(
      "PAL-PLY1042-01-P-RING-KAT-R1",
    );
    expect(palleyName({ orderRef: "PLY1042", index: 1, productCode: "P-RING-KAT", reprintNr: 0 })).toBe(
      "PAL-PLY1042-01-P-RING-KAT",
    );
  });

  it("round-trips", () => {
    for (const name of ["PAL-PLY1042-01-P-RING-KAT", "PAL-PLY1042-12-COL-FIG-007-R3", "PAL-PLY12345-01-P-CLP-R2D2"]) {
      expect(palleyName(parsePalleyName(name)!)).toBe(name);
    }
    expect(parsePalleyName("PAL-PLY1042-01-P-RING-KAT-R1")).toEqual({
      orderRef: "PLY1042",
      index: 1,
      productCode: "P-RING-KAT",
      reprintNr: 1,
    });
  });

  it("rejects invalid input", () => {
    expect(() => palleyName({ orderRef: "PAL-2026-00042", index: 1, productCode: "P-RING-KAT" })).toThrow();
    expect(() => palleyName({ orderRef: "PLY1042", index: 0, productCode: "P-RING-KAT" })).toThrow();
    expect(() => palleyName({ orderRef: "PLY1042", index: 1, productCode: "PAL-GP-KEY-KAT" })).toThrow();
    expect(() => palleyName({ orderRef: "PLY1042", index: 1, productCode: "P-RING-KAT", reprintNr: -1 })).toThrow();
    for (const value of ["PAL-PLY1042-1-P-RING-KAT", "PAL-PLY1042-01-P-RING-KAT-R0", "pal-ply1042-01-p-ring-kat", "PAL-PLY1042-01"]) {
      expect(parsePalleyName(value)).toBeNull();
    }
  });
});

describe("file names", () => {
  const name = "PAL-PLY1042-01-P-RING-KAT";

  it("adds the suffix per kind", () => {
    expect(palleyFileName(name, "obj")).toBe(`${name}.obj`);
    expect(palleyFileName(name, "mtl")).toBe(`${name}.mtl`);
    expect(palleyFileName(name, "texture")).toBe(`${name}.png`);
    expect(palleyFileName(name, "preview")).toBe(`${name}_preview.glb`);
    expect(palleyFileName(name, "pose")).toBe(`${name}_pose.png`);
    expect(palleyFileName(name, "print")).toBe(`${name}_print.zip`);
    expect(palleyFileName("COL-007-HOND", "print")).toBe("COL-007-HOND_print.zip");
    expect(palleyFileName("PRV-A3F9C2E1", "model")).toBe("PRV-A3F9C2E1.zip");
  });

  it("reads an uploaded file's name back", () => {
    expect(parsePalleyFileName(`${name}_print.zip`)).toEqual({ baseName: name, kind: "print" });
    expect(parsePalleyFileName(`${name}.zip`)).toEqual({ baseName: name, kind: "model" });
    expect(parsePalleyFileName(`${name}_pose.png`)).toEqual({ baseName: name, kind: "pose" });
    expect(parsePalleyFileName("Golden Retriever.zip")).toBeNull();
    expect(parsePalleyFileName("_print.zip")).toBeNull();
  });

  it("refuses spaces, lower case and accents", () => {
    for (const base of ["PAL PLY1042", "pal-ply1042", "PAL-PLŸ1042", "PAL--PLY1042", ""]) {
      expect(() => palleyFileName(base, "obj")).toThrow();
    }
  });

  it("names a download of several models", () => {
    expect(downloadZipName(new Date("2026-11-08T10:00:00Z"), 3)).toBe("DOWNLOAD-20261108-3.zip");
  });
});

describe("batches and bpost", () => {
  it("names batches, their zip and the CSVs", () => {
    expect(batchRef(1)).toBe("BATCH-0001");
    expect(parseBatchRef("BATCH-0001")).toBe(1);
    expect(batchZipName("BATCH-0001")).toBe("BATCH-0001.zip");
    expect(bpostCsvName("BATCH-0001", "BE", 1)).toBe("BPOST-BATCH-0001-BE-1.csv");
    expect(bpostCsvName("BATCH-0001", "INT", 2)).toBe("BPOST-BATCH-0001-INT-2.csv");
    expect(batchZipEntry("BATCH-0001", "PLY1042", "PAL-PLY1042-01-P-RING-KAT_print.zip")).toBe(
      "BATCH-0001/PLY1042/PAL-PLY1042-01-P-RING-KAT_print.zip",
    );
    expect(batchManifestEntry("BATCH-0001")).toBe("BATCH-0001/manifest.csv");
    expect(() => batchZipEntry("BATCH-0001", "PLY1042", "../secret.zip")).toThrow();
  });

  it("rejects invalid input", () => {
    expect(() => batchRef(0)).toThrow();
    expect(() => batchZipName("BATCH-1")).toThrow();
    expect(() => bpostCsvName("BATCH-0001", "NL" as "BE", 1)).toThrow();
    expect(() => bpostCsvName("BATCH-0001", "BE", 0)).toThrow();
  });
});
