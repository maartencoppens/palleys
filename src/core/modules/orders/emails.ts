import { formatPrice } from "@/core/utils/format";
import { vatIncluded } from "@/core/modules/catalog/utils";
import { COMPANY } from "@/data/company";
import { TERMS_URL } from "@/data/checkout";

/*
 * Order confirmation mail: the "durable medium" consumer law asks for (order, totals, company details, terms
 * version, withdrawal exception). Pure: builds subject/html/text, sending happens in payments/service.ts.
 * Every customer-supplied value is HTML-escaped.
 */

export type ConfirmationOrder = {
  number: string;
  firstName: string;
  lastName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  subtotalCents: number;
  shippingCents: number;
  vatCents: number;
  totalCents: number;
  termsVersion: string;
  items: { title: string; quantity: number; unitCents: number; notes: string | null }[];
  shipment: { label: string } | null;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const euro = (cents: number) => formatPrice(cents / 100);

// LEGAL-REVIEW: wording of the withdrawal exception and the legal guarantee.
const WITHDRAWAL_NOTE =
  "Je Palley wordt op maat gemaakt op basis van jouw foto. Daarom geldt het herroepingsrecht niet (art. VI.53, 3° WER). " +
  "De wettelijke garantie van 2 jaar blijft gelden: is er iets mis met je Palley, laat het ons weten.";

export function buildOrderConfirmation(order: ConfirmationOrder, appUrl: string) {
  const termsLink = `${appUrl}${TERMS_URL}?versie=${encodeURIComponent(order.termsVersion)}`;
  const subject = `Bedankt voor je bestelling ${order.number}`;
  const address = `${order.street} ${order.houseNumber}, ${order.postalCode} ${order.city}, ${order.country}`;
  const vatOfTotal = order.vatCents || vatIncluded(order.totalCents);

  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0">${escapeHtml(item.title)} × ${item.quantity}${
            item.notes ? `<br><span style="color:#666;font-size:13px">“${escapeHtml(item.notes)}”</span>` : ""
          }</td>
          <td style="padding:8px 0;text-align:right;white-space:nowrap">${euro(item.unitCents * item.quantity)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="nl"><body style="font-family:Arial,sans-serif;color:#1f2d24;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="font-size:22px">Bedankt, ${escapeHtml(order.firstName)}!</h1>
  <p>We hebben je betaling ontvangen. Ons team in Gent gaat aan de slag met je Palley.</p>
  <p><strong>Bestelnummer:</strong> ${escapeHtml(order.number)}</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #ddd;border-bottom:1px solid #ddd">${rows}
    <tr><td style="padding:8px 0">Verzending${order.shipment ? ` (${escapeHtml(order.shipment.label)})` : ""}</td>
        <td style="padding:8px 0;text-align:right">${euro(order.shippingCents)}</td></tr>
    <tr><td style="padding:8px 0"><strong>Totaal</strong></td>
        <td style="padding:8px 0;text-align:right"><strong>${euro(order.totalCents)}</strong></td></tr>
    <tr><td style="padding:0 0 8px;color:#666;font-size:13px">waarvan btw (21%)</td>
        <td style="padding:0 0 8px;text-align:right;color:#666;font-size:13px">${euro(vatOfTotal)}</td></tr>
  </table>
  <p><strong>Leveradres:</strong><br>${escapeHtml(`${order.firstName} ${order.lastName}`)}<br>${escapeHtml(address)}</p>
  <p>Elke Palley wordt met de hand gemodelleerd en geprint. Binnen 2–3 weken valt hij in je bus.</p>
  <p style="font-size:13px;color:#444">${WITHDRAWAL_NOTE}</p>
  <p style="font-size:13px;color:#444">Je ging akkoord met onze <a href="${escapeHtml(termsLink)}">algemene voorwaarden</a>
    (versie ${escapeHtml(order.termsVersion)}).</p>
  <hr style="border:none;border-top:1px solid #ddd">
  <p style="font-size:12px;color:#666">${escapeHtml(COMPANY.legalName)} · ${escapeHtml(COMPANY.address)}<br>
    Ondernemingsnummer ${escapeHtml(COMPANY.enterpriseNumber)} · btw ${escapeHtml(COMPANY.vatNumber)}<br>
    ${escapeHtml(COMPANY.email)}</p>
</body></html>`;

  const text = [
    `Bedankt, ${order.firstName}!`,
    "",
    "We hebben je betaling ontvangen. Ons team in Gent gaat aan de slag met je Palley.",
    `Bestelnummer: ${order.number}`,
    "",
    ...order.items.map((item) => `- ${item.title} × ${item.quantity}: ${euro(item.unitCents * item.quantity)}`),
    `Verzending${order.shipment ? ` (${order.shipment.label})` : ""}: ${euro(order.shippingCents)}`,
    `Totaal: ${euro(order.totalCents)} (waarvan btw ${euro(vatOfTotal)})`,
    "",
    `Leveradres: ${order.firstName} ${order.lastName}, ${address}`,
    "",
    WITHDRAWAL_NOTE,
    `Algemene voorwaarden (versie ${order.termsVersion}): ${termsLink}`,
    "",
    `${COMPANY.legalName} · ${COMPANY.address} · ondernemingsnummer ${COMPANY.enterpriseNumber} · btw ${COMPANY.vatNumber} · ${COMPANY.email}`,
  ].join("\n");

  return { subject, html, text };
}
