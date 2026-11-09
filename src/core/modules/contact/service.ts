import "server-only";
import { randomUUID } from "node:crypto";
import { EmailError, sendEmail } from "@/core/networking/external/email-client";
import { getShopSettings } from "@/core/modules/settings/service";
import { buildContactMail } from "./emails";
import type { ContactInput } from "./types";

/**
 * Mails a contact form message to the company e-mail from the settings, with the visitor as reply-to. Returns false when
 * it didn't go out (no mail configured, or Resend refused it): the form then says so instead of thanking them.
 */
export async function deliverContactMessage(input: ContactInput, now: Date = new Date()) {
  const { company } = await getShopSettings();
  try {
    const sent = await sendEmail({
      to: company.email,
      ...buildContactMail(input, now),
      replyTo: input.email,
      // Every message is new: a visitor may write twice on purpose.
      idempotencyKey: `contact-${randomUUID()}`,
    });
    if (!sent) console.warn("[contact] message not sent: e-mail is not configured");
    return sent;
  } catch (error) {
    console.error("[contact] message not sent:", error instanceof EmailError ? error.message : error);
    return false;
  }
}
