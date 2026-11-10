import { beforeEach, describe, expect, it, vi } from "vitest";

/* The contact form's delivery against the local database (company settings), with Resend mocked. */

const mail = vi.hoisted(() => ({ sent: [] as { to: string; cc?: string[]; replyTo?: string; subject: string }[], fail: false }));

vi.mock("@/core/networking/external/email-client", () => ({
  EmailError: class extends Error {},
  sendEmail: async (message: { to: string; cc?: string[]; replyTo?: string; subject: string }) => {
    if (mail.fail) throw new Error("Resend down");
    mail.sent.push(message);
    return true;
  },
}));

const { prisma } = await import("@/db/client");
const { deliverContactMessage } = await import("./service");
const { COMPANY } = await import("@/data/company");

beforeEach(async () => {
  mail.sent.length = 0;
  mail.fail = false;
  await prisma.shopSettings.deleteMany({ where: { id: 1 } });
});

describe("contact form delivery", () => {
  const message = { name: "Jan", email: "jan@example.be", message: "Hallo" };

  it("mails the company address with the team inbox in cc, and the visitor as reply-to", async () => {
    expect(await deliverContactMessage(message)).toBe(true);
    expect(mail.sent).toEqual([
      expect.objectContaining({ to: COMPANY.email, cc: [COMPANY.teamEmail], replyTo: "jan@example.be", subject: "Contactformulier: Jan" }),
    ]);
  });

  it("says so when the mail didn't go out", async () => {
    mail.fail = true;
    expect(await deliverContactMessage(message)).toBe(false);
  });
});
