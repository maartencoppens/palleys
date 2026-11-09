import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

/* The mailing list's backoffice side against the local database: unsubscribing and the CSV export. */

const { prisma } = await import("@/db/client");
const { buildSubscribersCsv, listSubscribers, subscribeToNewsletter, unsubscribe } = await import("./service");

const emails: string[] = [];
const subscribe = async (email: string) => {
  emails.push(email);
  await subscribeToNewsletter(prisma, { email, locale: "en", source: "checkout" });
  return prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email } });
};

afterAll(async () => {
  await prisma.newsletterSubscriber.deleteMany({ where: { email: { in: emails } } });
});

describe("mailing list", () => {
  it("exports only the addresses that are still subscribed", async () => {
    const staying = await subscribe(`blijft.${randomUUID()}@example.com`);
    const leaving = await subscribe(`weg.${randomUUID()}@example.com`);
    await unsubscribe(leaving.id);

    const csv = await buildSubscribersCsv();
    expect(csv.split("\r\n")[0]).toBe("email,language,subscribed_at,source");
    expect(csv).toContain(`${staying.email},en,`);
    expect(csv).not.toContain(leaving.email);

    const { subscribers } = await listSubscribers({ all: true });
    expect(subscribers.find((s) => s.id === leaving.id)?.unsubscribedAt).not.toBeNull();
  });

  it("keeps a spreadsheet from reading an address as a formula", async () => {
    const email = `=cmd.${randomUUID()}@example.com`;
    await subscribe(email);
    expect(await buildSubscribersCsv()).toContain(`'${email}`);
  });
});
