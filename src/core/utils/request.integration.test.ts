import { describe, expect, it } from "vitest";
import { getClientIp } from "./request";

describe("getClientIp", () => {
  it("takes the entry our own proxy added, not what the visitor sent", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }))).toBe("203.0.113.9");
    expect(getClientIp(new Headers({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("doesn't trust x-real-ip: a proxy that doesn't set it passes on what the visitor sent", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "1.2.3.4" }))).toBeNull();
  });
});
