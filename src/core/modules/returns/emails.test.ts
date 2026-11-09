import { describe, expect, it } from "vitest";
import { buildReturnDecisionMail, buildReturnLinkMail, buildReturnReceiptMail, buildReturnTeamMail } from "./emails";
import type { ReturnReceipt } from "./types";

const order = { number: "PLY1042", firstName: "Jan", locale: "nl" };
const receipt: ReturnReceipt = {
  id: "4c1f6a3e-1b2c-4d5e-8f90-123456789abc",
  type: "WITHDRAWAL",
  submittedAt: "2026-11-09T14:42:00.000Z",
  items: [{ title: "Hond <Rex>", quantity: 2 }],
  reason: null,
  resolution: null,
  itemsReceived: true,
  returnBy: "2026-11-23",
  returnAddress: "Bernheimlaan 26, 9050 Gentbrugge, België",
  photoCount: 0,
};

describe("return mails", () => {
  it("sends the link with how long it works", () => {
    const mail = buildReturnLinkMail(order, "https://palleys.be/retour#t=abc");
    expect(mail.subject).toContain("PLY1042");
    expect(mail.text).toContain("https://palleys.be/retour#t=abc");
    expect(mail.text).toContain("30 minuten");
  });

  it("acknowledges a withdrawal with what was sent, the date and time, and where it goes back to", () => {
    const mail = buildReturnReceiptMail(order, receipt);
    expect(mail.subject).toBe("Ontvangstbevestiging: herroeping voor bestelling PLY1042");
    expect(mail.text).toContain("9 november 2026 om 15:42");
    expect(mail.text).toContain("Hond <Rex> × 2");
    expect(mail.text).toContain("Bernheimlaan 26");
    expect(mail.text).toContain("23 november 2026");
    expect(mail.html).toContain("Hond &lt;Rex&gt;");
    expect(mail.html).not.toContain("<Rex>");
  });

  it("speaks the customer's language", () => {
    const mail = buildReturnReceiptMail({ ...order, locale: "en" }, { ...receipt, itemsReceived: false, returnBy: null });
    expect(mail.subject).toBe("Acknowledgement of receipt: withdrawal for order PLY1042");
    expect(mail.text).toContain("you don’t need to send anything back");
    expect(mail.text).not.toContain("Send the Palleys back");
  });

  it("uses a placeholder when no return address is set", () => {
    const mail = buildReturnReceiptMail(order, { ...receipt, returnAddress: "" });
    expect(mail.text).toContain("het adres dat we je mailen");
  });

  it("lists photos and the chosen solution of a warranty claim", () => {
    const mail = buildReturnReceiptMail(order, { ...receipt, type: "WARRANTY", reason: "Oortje afgebroken", resolution: "REPRINT", photoCount: 2, itemsReceived: false, returnBy: null });
    expect(mail.text).toContain("Oortje afgebroken");
    expect(mail.text).toContain("2 foto’s");
    expect(mail.text).toContain("Gratis opnieuw printen");
  });

  it("passes the reason of a rejection on to the customer, and needs one", () => {
    const request = { type: "WARRANTY" as const, itemsReceived: false, resolution: "REFUND" as const, decisionNote: "Valschade na ontvangst" };
    expect(buildReturnDecisionMail("rejected", order, request).text).toContain("Valschade na ontvangst");
    expect(() => buildReturnDecisionMail("rejected", order, { ...request, decisionNote: null })).toThrow();
    expect(buildReturnDecisionMail("approved", order, { ...request, resolution: "REPRINT" }).text).toContain("gratis opnieuw");
  });

  it("tells the team where to handle it", () => {
    const mail = buildReturnTeamMail({ ...order, lastName: "Peeters", email: "jan@example.be" }, receipt, "https://palleys.be/admin/orders/x");
    expect(mail.subject).toBe("Herroeping voor PLY1042");
    expect(mail.text).toContain("https://palleys.be/admin/orders/x");
    expect(mail.text).toContain("stuurt ze terug");
  });
});
