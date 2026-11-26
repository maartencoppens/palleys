import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/* Syncing the mailing list to Resend, against the local database and an in-memory Resend. */

const SEGMENT = "6c3a3f6e-1d2b-4a5c-9e8f-0a1b2c3d4e5f";
const resend = vi.hoisted(() => ({
  contacts: new Map<string, { unsubscribed: boolean; segments: Set<string> }>(),
  failFor: new Set<string>(),
}));

vi.mock("@/core/utils/env", async (original) => {
  const { env } = await original<typeof import("@/core/utils/env")>();
  return { env: { ...env, RESEND_SEGMENT_ID: SEGMENT } };
});

vi.mock("@/core/networking/external/resend-contacts", () => ({
  isContactSyncConfigured: () => true,
  getContact: async (email: string) => {
    if (resend.failFor.has(email)) throw new Error("Resend is down");
    const contact = resend.contacts.get(email);
    return contact ? { id: email, email, unsubscribed: contact.unsubscribed } : null;
  },
  createContact: async (email: string, { unsubscribed, segmentId }: { unsubscribed: boolean; segmentId?: string }) => {
    resend.contacts.set(email, { unsubscribed, segments: new Set(segmentId ? [segmentId] : []) });
  },
  setContactUnsubscribed: async (email: string, unsubscribed: boolean) => {
    resend.contacts.get(email)!.unsubscribed = unsubscribed;
  },
  ensureContactInSegment: async (email: string, segmentId: string) => {
    resend.contacts.get(email)!.segments.add(segmentId);
  },
}));

const { prisma } = await import("@/db/client");
const { markUnsubscribed, subscribeToNewsletter, syncAllSubscribersToResend, syncSubscriberToResend, unsubscribe } =
  await import("./service");

const emails: string[] = [];
const subscribe = async () => {
  const email = `resend.${randomUUID()}@example.com`;
  emails.push(email);
  await subscribeToNewsletter(prisma, { email, locale: "nl", source: "checkout" });
  return prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email } });
};
const isOnList = async (email: string) =>
  (await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email } })).unsubscribedAt === null;

beforeEach(() => {
  resend.failFor.clear();
});

afterAll(async () => {
  await prisma.newsletterSubscriber.deleteMany({ where: { email: { in: emails } } });
});

describe("mailing list → Resend", () => {
  it("adds a new subscriber to the segment, once", async () => {
    const { email } = await subscribe();
    expect(await syncSubscriberToResend(email, { freshConsent: true })).toBe("created");
    expect(resend.contacts.get(email)).toEqual({ unsubscribed: false, segments: new Set([SEGMENT]) });
    expect(await syncSubscriberToResend(email)).toBe("unchanged");
  });

  it("unsubscribes in Resend whoever is unsubscribed in the backoffice", async () => {
    const subscriber = await subscribe();
    await syncSubscriberToResend(subscriber.email);
    await unsubscribe(subscriber.id);
    expect(await syncSubscriberToResend(subscriber.email)).toBe("unsubscribed");
    expect(resend.contacts.get(subscriber.email)?.unsubscribed).toBe(true);
  });

  it("takes someone who unsubscribed through a mail off our list, instead of signing them up again", async () => {
    const { email } = await subscribe();
    await syncSubscriberToResend(email);
    resend.contacts.get(email)!.unsubscribed = true;
    expect(await syncSubscriberToResend(email)).toBe("unsubscribedHere");
    expect(await isOnList(email)).toBe(false);
    expect(resend.contacts.get(email)?.unsubscribed).toBe(true);
  });

  it("subscribes them again in Resend when they tick the box again", async () => {
    const { email } = await subscribe();
    resend.contacts.set(email, { unsubscribed: true, segments: new Set() });
    await subscribeToNewsletter(prisma, { email, locale: "nl", source: "checkout" });
    expect(await syncSubscriberToResend(email, { freshConsent: true })).toBe("resubscribed");
    expect(resend.contacts.get(email)).toEqual({ unsubscribed: false, segments: new Set([SEGMENT]) });
  });

  it("marks an address unsubscribed from the webhook only once", async () => {
    const { email } = await subscribe();
    expect(await markUnsubscribed(email.toUpperCase())).toBe(true);
    expect(await markUnsubscribed(email)).toBe(false);
    expect(await isOnList(email)).toBe(false);
  });

  it("syncs the whole list and keeps going when one address fails", async () => {
    const failing = await subscribe();
    const fine = await subscribe();
    resend.failFor.add(failing.email);
    const summary = await syncAllSubscribersToResend();
    expect(summary.failed).toBeGreaterThanOrEqual(1);
    expect(resend.contacts.get(fine.email)?.unsubscribed).toBe(false);
    expect(resend.contacts.has(failing.email)).toBe(false);
  });
});
