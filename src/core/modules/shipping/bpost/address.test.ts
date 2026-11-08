import { describe, expect, it } from "vitest";
import { bpostPhone, splitHouseNumber } from "./address";

describe("splitHouseNumber", () => {
  it("keeps a plain number whole", () => {
    for (const value of ["12", "12A", "12bis", "12-14", " 7 "]) {
      expect(splitHouseNumber(value)).toEqual({ number: value.trim(), box: "", uncertain: false });
    }
  });

  it("takes a box off a clear pattern", () => {
    expect(splitHouseNumber("12 bus 3")).toEqual({ number: "12", box: "3", uncertain: false });
    expect(splitHouseNumber("12 Bus 3a")).toEqual({ number: "12", box: "3A", uncertain: false });
    expect(splitHouseNumber("12, bte 4")).toEqual({ number: "12", box: "4", uncertain: false });
    expect(splitHouseNumber("12A box 101")).toEqual({ number: "12A", box: "101", uncertain: false });
    expect(splitHouseNumber("12/3")).toEqual({ number: "12", box: "3", uncertain: false });
    expect(splitHouseNumber("12 / A")).toEqual({ number: "12", box: "A", uncertain: false });
    expect(splitHouseNumber("12B3")).toEqual({ number: "12", box: "3", uncertain: false });
  });

  it("leaves anything unclear whole, for a person to check", () => {
    for (const value of ["12 3", "huis 12", "12 bus", "", "12 bus 3 achteraan"]) {
      expect(splitHouseNumber(value)).toMatchObject({ number: value.trim(), box: "", uncertain: true });
    }
  });
});

describe("bpostPhone", () => {
  it("writes a phone number as bpost's example does", () => {
    expect(bpostPhone("+32 476 28 68 13")).toBe("32476286813");
    expect(bpostPhone("0476/28.68.13")).toBe("32476286813");
    expect(bpostPhone("0032476286813")).toBe("32476286813");
  });

  it("leaves out what doesn't fit or isn't a number", () => {
    expect(bpostPhone("+3247628681312345")).toBeNull();
    expect(bpostPhone("bel me")).toBeNull();
    expect(bpostPhone(null)).toBeNull();
  });
});
