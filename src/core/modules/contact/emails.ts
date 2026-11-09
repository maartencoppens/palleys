import { escapeHtml } from "@/core/modules/orders/emails";
import { formatMoment } from "@/core/utils/format";
import type { ContactInput } from "./types";

/** A message from the contact form, for the team, in Dutch. Replying goes to the visitor (reply-to). Pure. */
export function buildContactMail(input: ContactInput, sentAt: Date) {
  const subject = `Contactformulier: ${input.name}`;
  const header = `${input.name} (${input.email}) schreef op ${formatMoment(sentAt.toISOString(), "nl")}:`;
  const footer = "Antwoord gewoon op deze mail: je antwoord gaat naar de afzender.";
  const html = `<!doctype html>
<html lang="nl"><body style="font-family:Arial,sans-serif;color:#1f2d24;max-width:560px;margin:0 auto;padding:24px">
  <p>${escapeHtml(header)}</p>
  <blockquote style="margin:0;padding:12px 16px;border-left:3px solid #2f5d4a;background:#f6f3ea">${escapeHtml(input.message).replaceAll("\n", "<br>")}</blockquote>
  <p style="font-size:13px;color:#666">${escapeHtml(footer)}</p>
</body></html>`;
  return { subject, html, text: [header, "", input.message, "", footer].join("\n") };
}
