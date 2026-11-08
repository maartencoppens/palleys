/*
 * Address parts the way bpost wants them, from what the customer typed. Pure, so it is tested on its own.
 */

export type HouseNumber = { number: string; box: string; uncertain: boolean };

// A number with at most a few letters after it: 12, 12A, 12bis, 12-14.
const PLAIN = /^\d+[A-Za-z]{0,3}(?:-\d+[A-Za-z]?)?$/;
// "12 bus 3", "12 bte 3", "12 boîte A", "12 box 3": a word for box between the number and the box.
const BOX_WORD = /^(\d+[A-Za-z]{0,3})\s*,?\s*(?:bus|bte|boîte|boite|box)\.?\s*([A-Za-z0-9]{1,6})$/i;
// "12/3", "12 / A".
const SLASH = /^(\d+[A-Za-z]?)\s*\/\s*([A-Za-z0-9]{1,6})$/;
// "12B3", "12 b 3": a b with a digit after it. "12B" alone is a house letter, not a box.
const LETTER_B = /^(\d+)\s*[bB]\s*(\d{1,4})$/;

/**
 * Splits a box off the house number when the pattern is clear. Anything else stays whole in the number and is
 * marked uncertain, so a person checks it before the label is made.
 */
export function splitHouseNumber(raw: string): HouseNumber {
  const value = raw.trim().replace(/\s+/g, " ");
  if (PLAIN.test(value)) return { number: value, box: "", uncertain: false };
  for (const pattern of [BOX_WORD, SLASH, LETTER_B]) {
    const match = pattern.exec(value);
    if (match) return { number: match[1], box: match[2].toUpperCase(), uncertain: false };
  }
  return { number: value, box: "", uncertain: true };
}

/**
 * A phone number as in bpost's example (32477789878): digits only, Belgian numbers with 32 in front. Null when it
 * doesn't fit in `max` digits or doesn't look like a phone number at all; it's optional, so it's simply left out.
 */
export function bpostPhone(raw: string | null | undefined, max = 12): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `32${digits.slice(1)}`;
  if (!/^\d{8,}$/.test(digits) || digits.length > max) return null;
  return digits;
}
