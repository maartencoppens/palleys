import { parcelFor } from "@/core/modules/catalog/utils";
import { bpostCsvName } from "@/core/utils/naming";
import {
  BPOST_CSV_FORMAT,
  BPOST_FIELD_HEADER,
  BPOST_GROUP_HEADER,
  BPOST_MAX_LABELS_PER_FILE,
  BPOST_MAX_WEIGHT_KG,
  BPOST_REFERENCE_MAX,
  BPOST_SENDER,
} from "@/data/bpost";
import { POSTAL_CODE_PATTERNS } from "@/data/shipping";
import type { KeychainSize } from "@/data/sizes";
import { bpostPhone, splitHouseNumber } from "./address";

/*
 * The CSV for bpost's online label tool, national template: one row per home delivery, at most
 * BPOST_MAX_LABELS_PER_FILE per file. Pure: the batch service gathers the orders, this turns them into files. An
 * order that can't be exported correctly is never dropped silently: it comes back in `problems` with the reasons.
 */

export type BpostOrder = {
  number: string;
  firstName: string;
  lastName: string;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  deliveryType: string | null;
  items: { size: string; quantity: number }[];
};

export type BpostProblem = { orderNumber: string; problems: string[] };
export type BpostFile = { name: string; bytes: Uint8Array; labels: number };
export type BpostExport = { files: BpostFile[]; exported: string[]; problems: BpostProblem[] };

// Required, max length, as in the template's header row.
const RECEIVER_FIELDS = [
  { label: "voornaam", max: 20, required: true },
  { label: "achternaam", max: 20, required: true },
  { label: "bedrijf", max: 40, required: false },
  { label: "straat", max: 50, required: true },
  { label: "huisnummer", max: 12, required: true },
  { label: "bus", max: 12, required: false },
  { label: "postcode", max: 20, required: true },
  { label: "gemeente", max: 40, required: true },
  { label: "e-mail", max: 50, required: false },
  { label: "gsm", max: 12, required: false },
] as const;
const SENDER_MAX = [20, 20, 40, 12, 50, 12, 12, 20, 40, 50, 12];
// Weight, reference, then the cash-on-delivery, warranty and confirmation options we never use.
const EMPTY_OPTIONS = ["", "", "", "", "", "", "", ""];

/** Grams → kg as bpost writes it: at most 3 decimals, decimal comma (2,955), at most 6 characters. */
export function formatWeightKg(grams: number) {
  const kg = Math.round(grams) / 1000;
  return String(Number(kg.toFixed(3))).replace(".", BPOST_CSV_FORMAT.decimalSeparator);
}

function senderFields() {
  const s = BPOST_SENDER;
  const fields = [s.firstName, s.lastName, s.company, s.vatNumber, s.street, s.number, s.box, s.postalCode, s.city, s.email, bpostPhone(s.mobile) ?? ""];
  fields.forEach((value, index) => {
    if (value.length > SENDER_MAX[index]) throw new Error(`bpost sender field ${index} is longer than ${SENDER_MAX[index]}`);
  });
  if (!s.firstName || !s.lastName || !s.street || !s.number || !s.postalCode || !s.city || !s.email) {
    throw new Error("bpost sender is incomplete (data/bpost.ts)");
  }
  return fields;
}

/** One label row, or what's wrong with the order. */
export function bpostRow(order: BpostOrder): { row: string[] } | { problems: string[] } {
  const problems: string[] = [];
  if (order.deliveryType !== "HOME") problems.push("Geen thuislevering: hoort niet in de bpost-CSV");
  if (order.country !== "BE") problems.push(`Land ${order.country}: we versturen alleen binnen België`);

  const house = splitHouseNumber(order.houseNumber ?? "");
  if (house.uncertain) problems.push(`Huisnummer "${order.houseNumber}" is niet duidelijk: zet nummer en bus apart`);
  const postalCode = order.postalCode?.trim() ?? "";
  if (postalCode && !POSTAL_CODE_PATTERNS.BE.test(postalCode)) problems.push(`Postcode "${postalCode}" is geen Belgische postcode`);
  const email = order.email?.trim() ?? "";

  const receiver = [
    order.firstName.trim(),
    order.lastName.trim(),
    "",
    order.street?.trim() ?? "",
    house.number,
    house.box,
    postalCode,
    order.city?.trim() ?? "",
    email,
    bpostPhone(order.phone) ?? "",
  ];
  receiver.forEach((value, index) => {
    const field = RECEIVER_FIELDS[index];
    if (field.required && !value) problems.push(`Ontbrekende ${field.label}`);
    if (value.length > field.max) problems.push(`${field.label} is langer dan ${field.max} tekens`);
  });

  const parcel = parcelFor(order.items.map((item) => ({ size: item.size as KeychainSize, quantity: item.quantity })));
  const weight = formatWeightKg(parcel.weightGrams);
  if (parcel.weightGrams <= 0 || parcel.weightGrams > BPOST_MAX_WEIGHT_KG * 1000 || weight.length > 6) {
    problems.push(`Gewicht ${weight} kg valt buiten wat bpost toelaat`);
  }
  if (order.number.length > BPOST_REFERENCE_MAX) problems.push(`Referentie ${order.number} is langer dan ${BPOST_REFERENCE_MAX} tekens`);

  const row = [...receiver, ...senderFields(), weight, order.number, ...EMPTY_OPTIONS];
  const unencodable = row.filter((value) => !isEncodable(value));
  if (unencodable.length > 0) problems.push(`Tekens die bpost niet kan lezen in: ${unencodable.join(", ")}`);

  return problems.length > 0 ? { problems } : { row };
}

/** The CSV files for a batch's home deliveries: BPOST-BATCH-0001-BE-1.csv, -2, ... */
export function buildBpostCsv(batchRef: string, orders: BpostOrder[]): BpostExport {
  const rows: string[][] = [];
  const exported: string[] = [];
  const problems: BpostProblem[] = [];
  for (const order of orders) {
    const result = bpostRow(order);
    if ("problems" in result) problems.push({ orderNumber: order.number, problems: result.problems });
    else {
      rows.push(result.row);
      exported.push(order.number);
    }
  }

  const files: BpostFile[] = [];
  for (let start = 0; start < rows.length; start += BPOST_MAX_LABELS_PER_FILE) {
    const chunk = rows.slice(start, start + BPOST_MAX_LABELS_PER_FILE);
    const text = [BPOST_GROUP_HEADER, BPOST_FIELD_HEADER, ...chunk.map(csvLine)].join(BPOST_CSV_FORMAT.lineEnding) + BPOST_CSV_FORMAT.lineEnding;
    files.push({ name: bpostCsvName(batchRef, "BE", files.length + 1), bytes: encode(text), labels: chunk.length });
  }
  return { files, exported, problems };
}

/** Quotes a field that holds the separator, a quote or a line break. */
export function csvField(value: string) {
  const { separator } = BPOST_CSV_FORMAT;
  return value.includes(separator) || /["\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

const csvLine = (row: string[]) => row.map(csvField).join(BPOST_CSV_FORMAT.separator);

// ---------- Encoding ----------

// Windows-1252 differs from Latin-1 only in 0x80-0x9F.
const CP1252_HIGH: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a,
  "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};

function cp1252Byte(char: string): number | null {
  const code = char.codePointAt(0)!;
  if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) return code;
  return CP1252_HIGH[char] ?? null;
}

/** Whether the configured encoding can hold this text (UTF-8 holds everything). */
export function isEncodable(text: string) {
  if (BPOST_CSV_FORMAT.encoding === "utf-8") return true;
  return [...text].every((char) => cp1252Byte(char) !== null);
}

/** Text → the bytes bpost reads, in the configured encoding. */
export function encode(text: string): Uint8Array {
  if (BPOST_CSV_FORMAT.encoding === "utf-8") {
    const body = new TextEncoder().encode(text);
    if (!BPOST_CSV_FORMAT.utf8Bom) return body;
    const withBom = new Uint8Array(body.length + 3);
    withBom.set([0xef, 0xbb, 0xbf]);
    withBom.set(body, 3);
    return withBom;
  }
  return Uint8Array.from([...text].map((char) => cp1252Byte(char) ?? 0x3f)); // "?" for what doesn't fit, never reached
}
