import { describe, expect, it } from "vitest";
import { KEYCHAIN_SIZES, SHOWN_KEYCHAIN_SIZE } from "@/data/sizes";
import { formatCentimeters } from "./format";

describe("formatCentimeters", () => {
  it("shows the keychain size the way each language writes it", () => {
    const meters = KEYCHAIN_SIZES[SHOWN_KEYCHAIN_SIZE].longestSideMeters;
    expect(formatCentimeters(meters, "nl")).toBe("3,7 cm");
    expect(formatCentimeters(meters, "en")).toBe("3.7 cm");
  });
});
