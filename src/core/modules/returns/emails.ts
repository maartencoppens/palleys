import { toLocale, type Locale } from "@/core/locale/config";
import { fill } from "@/core/locale/fill";
import { MESSAGES } from "@/core/locale/messages";
import { escapeHtml } from "@/core/modules/orders/emails";
import { formatDay, formatMoment } from "@/core/utils/format";
import { COMPANY } from "@/data/company";
import type { ReturnResolution, ReturnType } from "@/db/generated/enums";
import type { ReturnReceipt } from "./types";

/*
 * Mails of /retour, in the customer's language: the one-time link, the acknowledgement of receipt (the "durable medium"
 * the online withdrawal function needs: what was sent, and when), and the team's decision. The team's own mail is Dutch.
 * Pure, like orders/emails.ts: builds subject/html/text, sending happens in service.ts. Every value is HTML-escaped.
 */

type MailCompany = Pick<typeof COMPANY, "legalName" | "address" | "email">;
type MailOrder = { number: string; firstName: string; locale: string };

function shell(locale: Locale, title: string, paragraphs: string[], company: MailCompany, extraHtml = "") {
  const body = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`).join("\n  ");
  return `<!doctype html>
<html lang="${locale}"><body style="font-family:Arial,sans-serif;color:#1f2d24;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="font-size:22px">${escapeHtml(title)}</h1>
  ${body}${extraHtml}
  <hr style="border:none;border-top:1px solid #ddd">
  <p style="font-size:12px;color:#666">${escapeHtml(company.legalName)} · ${escapeHtml(company.address)}<br>${escapeHtml(company.email)}</p>
</body></html>`;
}

const footerLine = (company: MailCompany) => [company.legalName, company.address, company.email].join(" · ");

export function buildReturnLinkMail(order: MailOrder, link: string, { company = COMPANY }: { company?: MailCompany } = {}) {
  const locale = toLocale(order.locale);
  const m = MESSAGES[locale].returnEmail;
  const values = { number: order.number, name: order.firstName };
  const subject = fill(m.linkSubject, values);
  const title = fill(m.linkTitle, values);
  const text = fill(m.linkText, values);
  const button = `
  <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#e8673c;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${escapeHtml(m.linkButton)}</a></p>
  <p style="font-size:13px;color:#444">${escapeHtml(m.linkExpiry)}</p>`;
  const html = shell(locale, title, [text], company, button);
  return { subject, html, text: [title, "", text, "", link, "", m.linkExpiry, "", footerLine(company)].join("\n") };
}

/** The lines that describe a request, for the receipt (customer) and the team mail. */
function receiptLines(receipt: ReturnReceipt, locale: Locale) {
  const m = MESSAGES[locale].returns;
  const lines = [`${m.summary.items}:`, ...receipt.items.map((item) => `- ${item.title} × ${item.quantity}`)];
  if (receipt.type === "WARRANTY") {
    lines.push("", `${m.summary.description}: ${receipt.reason ?? ""}`, fill(m.summary.photos, { count: receipt.photoCount }));
    if (receipt.resolution) lines.push(`${m.summary.resolution}: ${m.form.resolutions[receipt.resolution]}`);
  } else {
    lines.push("", `${m.summary.reason}: ${receipt.reason ?? m.summary.noReason}`);
  }
  return lines;
}

/** What happens next, as the summary on the page said it. */
export function nextStepText(receipt: Pick<ReturnReceipt, "type" | "itemsReceived" | "returnAddress">, locale: Locale) {
  const m = MESSAGES[locale].returns.summary;
  if (receipt.type === "CANCELLATION") return m.cancellation;
  if (receipt.type === "WARRANTY") return m.warranty;
  if (!receipt.itemsReceived) return m.withdrawalBefore;
  // LEGAL-REVIEW: without a return address in the settings the customer is told we'll mail it.
  return fill(m.withdrawalAfter, { address: receipt.returnAddress || m.returnAddressMissing });
}

export function buildReturnReceiptMail(order: MailOrder, receipt: ReturnReceipt, { company = COMPANY }: { company?: MailCompany } = {}) {
  const locale = toLocale(order.locale);
  const m = MESSAGES[locale].returnEmail;
  const type = MESSAGES[locale].returns.typesLower[receipt.type];
  const values = { number: order.number, name: order.firstName, type, date: formatMoment(receipt.submittedAt, locale) };
  const subject = fill(m.receiptSubject, values);
  const title = fill(m.receiptTitle, values);
  const paragraphs = [fill(m.receiptText, values), receiptLines(receipt, locale).join("\n"), nextStepText(receipt, locale)];
  if (receipt.returnBy) paragraphs.push(fill(MESSAGES[locale].returns.done.returnBy, { date: formatDay(receipt.returnBy, locale) }));
  paragraphs.push(m.footer);
  const html = shell(locale, title, paragraphs, company);
  return { subject, html, text: [title, "", ...paragraphs.flatMap((paragraph) => [paragraph, ""]), footerLine(company)].join("\n") };
}

export type DecisionRequest = {
  type: ReturnType;
  itemsReceived: boolean;
  resolution: ReturnResolution | null;
  decisionNote: string | null;
};

function approvedText(request: DecisionRequest, locale: Locale, returnAddress: string) {
  const m = MESSAGES[locale].returnEmail.approved;
  if (request.type === "CANCELLATION") return m.cancellation;
  if (request.type === "WARRANTY") return request.resolution === "REPRINT" ? m.reprint : m.refund;
  if (!request.itemsReceived) return m.withdrawalBefore;
  return fill(m.withdrawalAfter, { address: returnAddress || MESSAGES[locale].returns.summary.returnAddressMissing });
}

export function buildReturnDecisionMail(
  decision: "approved" | "rejected",
  order: MailOrder,
  request: DecisionRequest,
  { company = COMPANY, returnAddress = "" }: { company?: MailCompany; returnAddress?: string } = {},
) {
  const locale = toLocale(order.locale);
  const m = MESSAGES[locale].returnEmail;
  const values = { number: order.number, name: order.firstName, type: MESSAGES[locale].returns.typesLower[request.type] };
  if (decision === "rejected" && !request.decisionNote) throw new Error("A rejection needs a reason");
  const subject = fill(decision === "approved" ? m.approvedSubject : m.rejectedSubject, values);
  const title = fill(decision === "approved" ? m.approvedTitle : m.rejectedTitle, values);
  const paragraphs =
    decision === "approved"
      ? [approvedText(request, locale, returnAddress), m.footer]
      : [fill(m.rejectedText, values), request.decisionNote!, m.rejectedFooter];
  const html = shell(locale, title, paragraphs, company);
  return { subject, html, text: [title, "", ...paragraphs.flatMap((paragraph) => [paragraph, ""]), footerLine(company)].join("\n") };
}

/** For the team, in Dutch: a new request to look at in the backoffice. */
export function buildReturnTeamMail(
  order: { number: string; firstName: string; lastName: string; email: string | null },
  receipt: ReturnReceipt,
  adminUrl: string,
) {
  const type = MESSAGES.nl.returns.types[receipt.type];
  const subject = `${type} voor ${order.number}`;
  const paragraphs = [
    `${order.firstName} ${order.lastName} (${order.email ?? "geen e-mail"}) stuurde op ${formatMoment(receipt.submittedAt, "nl")} een ${type.toLowerCase()} voor ${order.number}.`,
    receiptLines(receipt, "nl").join("\n"),
    receipt.type === "WITHDRAWAL" ? (receipt.itemsReceived ? "De klant heeft de Palleys al en stuurt ze terug." : "Nog niet verstuurd: meteen terugbetalen.") : "",
    `Bekijken en afhandelen: ${adminUrl}`,
  ].filter(Boolean);
  const html = shell("nl", subject, paragraphs, COMPANY);
  return { subject, html, text: [subject, "", ...paragraphs.flatMap((paragraph) => [paragraph, ""])].join("\n") };
}
