import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BPOST_FIELD_HEADER, BPOST_GROUP_HEADER, BPOST_TEMPLATE_FILE } from "@/data/bpost";
import { bpostRow, buildBpostCsv, csvField, encode, formatWeightKg, type BpostOrder } from "./csv";

const order = (overrides: Partial<BpostOrder> = {}): BpostOrder => ({
  number: "PLY1042",
  firstName: "Anaïs",
  lastName: "Peeters",
  street: "Zwartzustersvest",
  houseNumber: "24 bus 2",
  postalCode: "2800",
  city: "Mechelen",
  country: "BE",
  email: "anais@example.com",
  phone: "0477 78 98 78",
  deliveryType: "HOME",
  items: [{ size: "M", quantity: 1 }],
  ...overrides,
});

// Windows-1252 bytes back to text, to read what we wrote.
const decode = (bytes: Uint8Array) => new TextDecoder("windows-1252").decode(bytes);

describe("bpost template", () => {
  it("uses bpost's two header rows literally", () => {
    const [groups, fields] = decode(readFileSync(BPOST_TEMPLATE_FILE)).split("\n");
    expect(BPOST_GROUP_HEADER).toBe(groups);
    expect(BPOST_FIELD_HEADER).toBe(fields);
    expect(BPOST_FIELD_HEADER.split(";")).toHaveLength(31);
  });
});

describe("bpost rows", () => {
  it("fills receiver, sender, weight and reference in the template's order", () => {
    const result = bpostRow(order());
    if (!("row" in result)) throw new Error(JSON.stringify(result));
    expect(result.row).toHaveLength(31);
    expect(result.row.slice(0, 10)).toEqual(["Anaïs", "Peeters", "", "Zwartzustersvest", "24", "2", "2800", "Mechelen", "anais@example.com", "32477789878"]);
    expect(result.row.slice(10, 21)).toEqual(["Joran", "Vreye", "Palleys", "", "Bernheimlaan", "26", "", "9050", "Gentbrugge", "hallo@palleys.be", "32476286813"]);
    expect(result.row[21]).toBe("0,045"); // one Palley (15 g) in one box (30 g)
    expect(result.row[22]).toBe("PLY1042");
    expect(result.row.slice(23).every((value) => value === "")).toBe(true);
  });

  it("weighs boxes of two", () => {
    expect(formatWeightKg(3 * 15 + 2 * 30)).toBe("0,105");
    expect(formatWeightKg(2955)).toBe("2,955");
    expect(formatWeightKg(12000)).toBe("12");
  });

  it("refuses what bpost can't take, with the reasons", () => {
    const problems = (o: Partial<BpostOrder>) => {
      const result = bpostRow(order(o));
      return "problems" in result ? result.problems.join(" | ") : "";
    };
    expect(problems({ deliveryType: "PICKUP" })).toContain("Geen thuislevering");
    expect(problems({ country: "NL" })).toContain("alleen binnen België");
    expect(problems({ houseNumber: "12 3" })).toContain("niet duidelijk");
    expect(problems({ houseNumber: null })).toContain("Ontbrekende huisnummer");
    expect(problems({ postalCode: "123" })).toContain("geen Belgische postcode");
    expect(problems({ firstName: "Maximiliaan-Alexander Johannes" })).toContain("voornaam is langer dan 20");
    expect(problems({ street: "x".repeat(51) })).toContain("straat is langer dan 50");
    expect(problems({ number: "PLY1234567890" })).toContain("langer dan 12");
    expect(problems({ lastName: "Łukasz" })).toContain("niet kan lezen");
    expect(problems({ items: [{ size: "M", quantity: 1200 }] })).toContain("Gewicht"); // over 30 kg
  });

  it("leaves a phone number out when it doesn't fit, rather than refusing the order", () => {
    const result = bpostRow(order({ phone: "+44 7700 900123 456" }));
    expect("row" in result && result.row[9]).toBe("");
  });
});

describe("bpost files", () => {
  it("quotes a field with the separator or a quote", () => {
    expect(csvField("Rue de l'Anémone")).toBe("Rue de l'Anémone");
    expect(csvField('De "Kroon"; achteraan')).toBe('"De ""Kroon""; achteraan"');
  });

  it("writes Windows-1252 so accents survive", () => {
    expect([...encode("é")]).toEqual([0xe9]);
    expect([...encode("€")]).toEqual([0x80]);
  });

  it("splits per 50 labels and names the files after the batch", () => {
    const orders = Array.from({ length: 101 }, (_, index) => order({ number: `PLY${1001 + index}` }));
    const result = buildBpostCsv("BATCH-0001", orders);
    expect(result.files.map((file) => [file.name, file.labels])).toEqual([
      ["BPOST-BATCH-0001-BE-1.csv", 50],
      ["BPOST-BATCH-0001-BE-2.csv", 50],
      ["BPOST-BATCH-0001-BE-3.csv", 1],
    ]);
    const lines = decode(result.files[2].bytes).split("\n");
    expect(lines[0]).toBe(BPOST_GROUP_HEADER);
    expect(lines[1]).toBe(BPOST_FIELD_HEADER);
    expect(lines[2].startsWith("Anaïs;Peeters;;Zwartzustersvest;24;2;2800;")).toBe(true);
  });

  it("never drops an order silently", () => {
    const result = buildBpostCsv("BATCH-0001", [order(), order({ number: "PLY1043", houseNumber: "?" }), order({ number: "PLY1044", deliveryType: "PICKUP" })]);
    expect(result.exported).toEqual(["PLY1042"]);
    expect(result.problems.map((problem) => problem.orderNumber)).toEqual(["PLY1043", "PLY1044"]);
  });
});
