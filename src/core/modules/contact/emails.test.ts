import { describe, expect, it } from "vitest";
import { contactSchema } from "./types";
import { buildContactMail } from "./emails";

describe("contact form", () => {
  it("mails the message with who sent it and when, safely escaped", () => {
    const mail = buildContactMail(
      { name: "Jan", email: "jan@example.be", message: "Kan mijn kat <Minou> ook?\nGroetjes" },
      new Date("2026-11-09T14:42:00Z"),
    );
    expect(mail.subject).toBe("Contactformulier: Jan");
    expect(mail.text).toContain("Jan (jan@example.be) schreef op 9 november 2026 om 15:42:");
    expect(mail.text).toContain("Kan mijn kat <Minou> ook?");
    expect(mail.html).toContain("&lt;Minou&gt; ook?<br>Groetjes");
  });

  it("refuses what doesn't fit", () => {
    const ok = { name: "Jan", email: " Jan@Example.be ", message: "Hallo" };
    expect(contactSchema.parse(ok).email).toBe("jan@example.be");
    expect(contactSchema.safeParse({ ...ok, email: "geen-mail" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...ok, name: "<script>" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...ok, message: "x".repeat(5001) }).success).toBe(false);
  });
});
