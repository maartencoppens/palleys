import "server-only";
import { prisma } from "@/db/client";
import type { Prisma } from "@/db/generated/client";
import { env } from "@/core/utils/env";
import { maskEmail } from "@/core/modules/orders/utils";
import {
  createContact,
  ensureContactInSegment,
  getContact,
  isContactSyncConfigured,
  setContactUnsubscribed,
} from "@/core/networking/external/resend-contacts";

/*
 * The mailing list: addresses with their consent from the checkout box. Ticking the box again after unsubscribing
 * counts as new consent, so the address is active again with a fresh date. The list here is the source of truth;
 * Resend (where the broadcasts are sent from) gets a copy as contacts in RESEND_SEGMENT_ID: on subscribing, on
 * unsubscribing in the backoffice and with the sync button. Unsubscribing through a broadcast's link comes back
 * through the webhook (/api/webhooks/resend). The backoffice (/admin/mailing) shows the list and exports it as CSV.
 */
export async function subscribeToNewsletter(
  tx: Prisma.TransactionClient,
  { email, locale, source }: { email: string; locale: string; source: string },
) {
  const now = new Date();
  await tx.newsletterSubscriber.upsert({
    where: { email: email.trim().toLowerCase() },
    create: { email: email.trim().toLowerCase(), locale, source, subscribedAt: now },
    update: { locale, subscribedAt: now, unsubscribedAt: null },
  });
}

export class SubscriberNotFoundError extends Error {}

/** For the backoffice: the active addresses, newest first, and with `all` also those who unsubscribed. */
export async function listSubscribers({ all = false } = {}) {
  const [subscribers, activeCount] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where: all ? {} : { unsubscribedAt: null },
      orderBy: { subscribedAt: "desc" },
    }),
    prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
  ]);
  return { subscribers, activeCount };
}

/** Someone asked to be taken off the list. Kept as unsubscribed, so a later import can't sign them up by mistake. */
export async function unsubscribe(id: string) {
  const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { id } });
  if (!subscriber) throw new SubscriberNotFoundError();
  if (subscriber.unsubscribedAt) return subscriber;
  return prisma.newsletterSubscriber.update({ where: { id }, data: { unsubscribedAt: new Date() } });
}

/** Unsubscribed in Resend (the link in a broadcast) or deleted there: off our list too. False = nothing changed. */
export async function markUnsubscribed(email: string) {
  const { count } = await prisma.newsletterSubscriber.updateMany({
    where: { email: email.trim().toLowerCase(), unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });
  return count > 0;
}

export type SyncOutcome = "created" | "resubscribed" | "unsubscribed" | "unsubscribedHere" | "unchanged" | "skipped";

/**
 * Puts one address in Resend the way our list has it. One exception: an address that unsubscribed in Resend (through
 * a broadcast's link) while still on our list is taken off our list, unless `freshConsent`: they just ticked the box.
 */
export async function syncSubscriberToResend(email: string, { freshConsent = false } = {}): Promise<SyncOutcome> {
  if (!isContactSyncConfigured()) return "skipped";
  const address = email.trim().toLowerCase();
  const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { email: address } });
  if (!subscriber) return "skipped";
  const contact = await getContact(address);
  const segmentId = env.RESEND_SEGMENT_ID;

  if (subscriber.unsubscribedAt) {
    if (!contact || contact.unsubscribed) return "unchanged";
    await setContactUnsubscribed(address, true);
    return "unsubscribed";
  }
  if (!contact) {
    await createContact(address, { unsubscribed: false, segmentId });
    return "created";
  }
  if (contact.unsubscribed && !freshConsent) {
    await markUnsubscribed(address);
    return "unsubscribedHere";
  }
  if (contact.unsubscribed) await setContactUnsubscribed(address, false);
  if (segmentId) await ensureContactInSegment(address, segmentId);
  return contact.unsubscribed ? "resubscribed" : "unchanged";
}

export type SyncSummary = Record<SyncOutcome | "failed", number>;

/** The sync button: every address on the list (also the unsubscribed ones) once through syncSubscriberToResend. */
export async function syncAllSubscribersToResend(): Promise<SyncSummary> {
  const summary: SyncSummary = { created: 0, resubscribed: 0, unsubscribed: 0, unsubscribedHere: 0, unchanged: 0, skipped: 0, failed: 0 };
  const subscribers = await prisma.newsletterSubscriber.findMany({ select: { email: true }, orderBy: { subscribedAt: "asc" } });
  // One by one: Resend allows 10 requests a second, and the client waits on a 429.
  for (const { email } of subscribers) {
    try {
      summary[await syncSubscriberToResend(email)]++;
    } catch (error) {
      summary.failed++;
      console.error(`[newsletter] Resend sync failed for ${maskEmail(email)}:`, error instanceof Error ? error.message : error);
    }
  }
  return summary;
}

// Quoted where needed, and a leading = + - @ neutralised so a spreadsheet never reads a cell as a formula.
const csvCell = (value: string) => {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

/** The active addresses as CSV, ready to import into a mailing tool. */
export async function buildSubscribersCsv() {
  const { subscribers } = await listSubscribers();
  const rows = [
    ["email", "language", "subscribed_at", "source"],
    ...subscribers.map((s) => [s.email, s.locale, s.subscribedAt.toISOString(), s.source]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
