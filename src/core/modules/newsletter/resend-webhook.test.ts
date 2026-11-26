import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { unsubscribedEmail, verifyResendWebhook } from "./resend-webhook";

// The example from Svix's "verifying payloads manually" docs.
const SECRET = "whsec_plJ3nmyCDGBKInavdOK15jsl";
const BODY = '{"event_type":"ping","data":{"success":true}}';
const ID = "msg_loFOjxBNrRLzqYUf";
const TIMESTAMP = "1731705121";
const SIGNATURE = "v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=";
const AT = Number(TIMESTAMP) * 1000;

const headers = (signature = SIGNATURE, timestamp = TIMESTAMP) =>
  new Headers({ "svix-id": ID, "svix-timestamp": timestamp, "svix-signature": signature });

describe("Resend webhook signature", () => {
  it("accepts Svix's own example", () => {
    expect(verifyResendWebhook(BODY, headers(), SECRET, AT)).toBe(true);
  });

  it("accepts the right signature among others", () => {
    expect(verifyResendWebhook(BODY, headers(`v1,AAAA ${SIGNATURE} v2,BBBB`), SECRET, AT)).toBe(true);
  });

  it("refuses a changed body, another secret or a missing header", () => {
    expect(verifyResendWebhook(BODY.replace("true", "false"), headers(), SECRET, AT)).toBe(false);
    expect(verifyResendWebhook(BODY, headers(), "whsec_c29tZXRoaW5nIGVsc2U=", AT)).toBe(false);
    expect(verifyResendWebhook(BODY, new Headers({ "svix-id": ID, "svix-timestamp": TIMESTAMP }), SECRET, AT)).toBe(false);
  });

  it("refuses a message more than five minutes off", () => {
    expect(verifyResendWebhook(BODY, headers(), SECRET, AT + 6 * 60 * 1000)).toBe(false);
    const later = String(Number(TIMESTAMP) + 600);
    const key = Buffer.from(SECRET.slice("whsec_".length), "base64");
    const signature = `v1,${createHmac("sha256", key).update(`${ID}.${later}.${BODY}`).digest("base64")}`;
    expect(verifyResendWebhook(BODY, headers(signature, later), SECRET, AT)).toBe(false);
    expect(verifyResendWebhook(BODY, headers(signature, later), SECRET, AT + 600 * 1000)).toBe(true);
  });
});

describe("contact events", () => {
  const event = (type: string, unsubscribed: boolean) => ({ type, data: { email: " Jan@Example.com ", unsubscribed } });

  it("takes an address off the list when it unsubscribes or is deleted in Resend", () => {
    expect(unsubscribedEmail(event("contact.updated", true))).toBe("jan@example.com");
    expect(unsubscribedEmail(event("contact.deleted", false))).toBe("jan@example.com");
  });

  it("never signs anyone up from Resend's side", () => {
    expect(unsubscribedEmail(event("contact.updated", false))).toBeNull();
    expect(unsubscribedEmail(event("contact.created", false))).toBeNull();
    expect(unsubscribedEmail({ type: "email.delivered", data: { email: "jan@example.com" } })).toBeNull();
  });
});
