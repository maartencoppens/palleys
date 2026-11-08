import { describe, expect, it } from "vitest";
import { batchContents, deliveryGroup, editionForJlc, finishedLabel, isOrderPrintReady, manifestCsv, type BatchItemSource } from "./utils";

const personalized = (overrides: Partial<BatchItemSource> = {}): BatchItemSource => ({
  position: 1,
  productCode: "P-RING-KAT",
  reprintNr: 0,
  quantity: 1,
  preview: { status: "PRINT_READY", processedKey: "previews/a/processed-1.zip" },
  collectible: null,
  ...overrides,
});
const collectible = (overrides: Partial<BatchItemSource> = {}): BatchItemSource => ({
  position: 2,
  productCode: "COL-CLP-007",
  reprintNr: 0,
  quantity: 3,
  preview: null,
  collectible: { modelKey: "collectibles/models/m.zip" },
  ...overrides,
});

describe("print-ready orders", () => {
  it("needs every item ready: a processed zip, or a collectible's model", () => {
    expect(isOrderPrintReady([personalized(), collectible()])).toBe(true);
    expect(isOrderPrintReady([personalized({ preview: { status: "APPROVED", processedKey: null } }), collectible()])).toBe(false);
    expect(isOrderPrintReady([personalized({ preview: { status: "APPROVED", processedKey: "x.zip" } })])).toBe(false);
    expect(isOrderPrintReady([collectible({ collectible: { modelKey: null } })])).toBe(false);
    expect(isOrderPrintReady([])).toBe(false);
  });
});

describe("delivery groups", () => {
  it("sends home deliveries to bpost and keeps the rest apart", () => {
    expect(deliveryGroup("HOME")).toBe("deliver");
    expect(deliveryGroup("PICKUP")).toBe("pickup");
    expect(deliveryGroup("HANDOVER")).toBe("pickup");
    expect(deliveryGroup("SERVICE_POINT")).toBe("other");
    expect(deliveryGroup(null)).toBe("other");
  });

  it("names a finished order after how it left", () => {
    expect(finishedLabel("HOME")).toBe("Verzonden");
    expect(finishedLabel("PICKUP")).toBe("Opgehaald");
    expect(finishedLabel("HANDOVER")).toBe("Overhandigd");
  });
});

describe("batch zip contents", () => {
  const orders = [
    { number: "PLY1043", items: [personalized({ productCode: "P-FIG-HOND", preview: { status: "PRINT_READY", processedKey: "previews/b/p.zip" } })] },
    { number: "PLY1042", items: [collectible(), personalized({ reprintNr: 1 })] },
  ];

  it("puts each Palley under its order, named through naming.ts", () => {
    const { entries, missing } = batchContents("BATCH-0001", orders);
    expect(missing).toEqual([]);
    expect(entries.map((entry) => [entry.path, entry.key])).toEqual([
      ["BATCH-0001/PLY1042/PAL-PLY1042-01-P-RING-KAT-R1_print.zip", "previews/a/processed-1.zip"],
      ["BATCH-0001/PLY1042/PAL-PLY1042-02-COL-CLP-007_print.zip", "collectibles/models/m.zip"],
      ["BATCH-0001/PLY1043/PAL-PLY1043-01-P-FIG-HOND_print.zip", "previews/b/p.zip"],
    ]);
  });

  it("lists every Palley for JLC with how many copies to print", () => {
    const csv = manifestCsv(batchContents("BATCH-0001", orders).manifest).split("\r\n");
    expect(csv[0]).toBe("order,palley,product_code,edition,copies,file");
    expect(csv[2]).toBe("PLY1042,PAL-PLY1042-02-COL-CLP-007,COL-CLP-007,Keychain (clip),3,PAL-PLY1042-02-COL-CLP-007_print.zip");
    expect(csv[3]).toBe("PLY1043,PAL-PLY1043-01-P-FIG-HOND,P-FIG-HOND,Figure,1,PAL-PLY1043-01-P-FIG-HOND_print.zip");
  });

  it("names what has no file instead of leaving it out", () => {
    const { missing } = batchContents("BATCH-0001", [{ number: "PLY1042", items: [personalized({ preview: { status: "APPROVED", processedKey: null } })] }]);
    expect(missing).toEqual(["PAL-PLY1042-01-P-RING-KAT"]);
  });

  it("describes editions in English", () => {
    expect(editionForJlc("P-RING-KAT")).toBe("Keychain (key ring)");
    expect(editionForJlc("COL-CLP-007")).toBe("Keychain (clip)");
    expect(editionForJlc("P-FIG-KAT")).toBe("Figure");
  });
});
