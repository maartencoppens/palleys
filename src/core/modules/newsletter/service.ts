import "server-only";
import { prisma } from "@/db/client";
import type { Prisma } from "@/db/generated/client";

/*
 * The mailing list. For now it only collects addresses with their consent: nothing is sent yet. Ticking the box
 * again after unsubscribing counts as new consent, so the address is active again with a fresh date.
 * The backoffice (/admin/mailing) shows the list, exports it as CSV and takes people off it.
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
