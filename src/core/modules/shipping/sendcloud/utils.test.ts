import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidSendcloudSignature } from "./signature";
import { isHandedOver, orderNumberOf } from "./utils";

describe("Sendcloud signature", () => {
  it("matches the example in Sendcloud's docs", () => {
    const signature = "1eed4b3d41f4653ac64fd56f1bf1cbfd349e4482cbc11dff7134bd93e5da4b0a";
    expect(isValidSendcloudSignature('{"key": "value"}', signature, "secretkey")).toBe(true);
    expect(isValidSendcloudSignature('{"key": "value"}', signature.toUpperCase(), "secretkey")).toBe(true);
  });

  it("refuses another body, another secret, or no signature", () => {
    const body = '{"action":"parcel_status_changed"}';
    const signature = createHmac("sha256", "secret-of-sixteen").update(body).digest("hex");
    expect(isValidSendcloudSignature(body, signature, "secret-of-sixteen")).toBe(true);
    expect(isValidSendcloudSignature(`${body} `, signature, "secret-of-sixteen")).toBe(false);
    expect(isValidSendcloudSignature(body, signature, "another-secret!!")).toBe(false);
    expect(isValidSendcloudSignature(body, null, "secret-of-sixteen")).toBe(false);
    expect(isValidSendcloudSignature(body, "not-hex", "secret-of-sixteen")).toBe(false);
  });
});

describe("Sendcloud statuses", () => {
  it("counts a parcel as shipped once the carrier has it", () => {
    for (const message of ["Ready to send", "Announced", "No label", "Cancelled", "Cancellation requested", "Address invalid"]) {
      expect(isHandedOver(message), message).toBe(false);
    }
    for (const message of ["En route to sorting center", "Sorted", "Driver en route", "Delivered", "Delivery delayed", "Awaiting customer pickup"]) {
      expect(isHandedOver(message), message).toBe(true);
    }
  });

  it("finds our order number in either field", () => {
    expect(orderNumberOf({ order_number: "PAL-2026-00042" })).toBe("PAL-2026-00042");
    expect(orderNumberOf({ order_number: "1042", external_order_id: " PAL-2026-00042 " })).toBe("PAL-2026-00042");
    expect(orderNumberOf({ order_number: "#1042" })).toBeNull();
  });
});
