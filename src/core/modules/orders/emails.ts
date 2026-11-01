import { formatPrice } from "@/core/utils/format";
import { vatIncluded } from "@/core/modules/catalog/utils";
import { COMPANY } from "@/data/company";
import { TERMS_URL } from "@/data/checkout";
import { DEFAULT_SITE_CONTENT } from "@/data/site-content";

/*
 * Order confirmation mail: the "durable medium" consumer law asks for (order, totals, company details, terms
 * version, withdrawal exception). Pure: builds subject/html/text, sending happens in payments/service.ts.
 * Every customer-supplied value is HTML-escaped.
 */

export type ConfirmationOrder = {
  number: string;
  firstName: string;
  lastName: string;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  subtotalCents: number;
  shippingCents: number;
  vatCents: number;
  totalCents: number;
  /** Null when an admin added the order: the customer never saw the checkbox. */
  termsVersion: string | null;
  items: { title: string; quantity: number; unitCents: number; notes: string | null; withdrawable: boolean }[];
  shipment: { label: string; deliveryType: string } | null;
};

type ConfirmationSettings = {
  company?: Pick<typeof COMPANY, "legalName" | "address" | "enterpriseNumber" | "vatNumber" | "email">;
  deliveryTime?: string;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const euro = (cents: number) => formatPrice(cents / 100);

const GUARANTEE_NOTE = "De wettelijke garantie van 2 jaar blijft gelden: is er iets mis met je Palley, laat het ons weten.";

// LEGAL-REVIEW: wording of the withdrawal exception, the right of withdrawal and the legal guarantee.
function withdrawalNote(items: ConfirmationOrder["items"]) {
  const personalized = items.some((item) => !item.withdrawable);
  const collectible = items.some((item) => item.withdrawable);
  return [
    personalized && "Je Palley wordt op maat gemaakt op basis van jouw foto. Daarom geldt het herroepingsrecht niet (art. VI.53, 3° WER).",
    collectible && "Collectibles zijn niet op maat gemaakt: die mag je binnen 14 dagen na ontvangst zonder reden herroepen en terugsturen. Mail ons dan met je bestelnummer.",
    GUARANTEE_NOTE,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildOrderConfirmation(
  order: ConfirmationOrder,
  appUrl: string,
  { company = COMPANY, deliveryTime = DEFAULT_SITE_CONTENT.deliveryTime }: ConfirmationSettings = {},
) {
  const termsLink = `${appUrl}${TERMS_URL}${order.termsVersion ? `?versie=${encodeURIComponent(order.termsVersion)}` : ""}`;
  const subject = `Bedankt voor je bestelling ${order.number}`;
  const address = order.street ? `${order.street} ${order.houseNumber}, ${order.postalCode} ${order.city}, ${order.country}` : null;
  const handover = order.shipment?.deliveryType === "HANDOVER";
  const vatOfTotal = order.vatCents || vatIncluded(order.totalCents);
  const note = withdrawalNote(order.items);
  const allCollectibles = order.items.every((item) => item.withdrawable);
  const delivery = handover
    ? "We laten je weten wanneer je bestelling klaar is, dan overhandigen we ze persoonlijk."
    : allCollectibles
      ? `Binnen ${deliveryTime} valt je bestelling in je bus.`
      : `Elke Palley wordt met de hand gemodelleerd en geprint. Binnen ${deliveryTime} valt hij in je bus.`;
  const termsLine = order.termsVersion
    ? `Je ging akkoord met onze algemene voorwaarden (versie ${order.termsVersion})`
    : "Op je bestelling gelden onze algemene voorwaarden";

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
  ${address ? `<p><strong>Leveradres:</strong><br>${escapeHtml(`${order.firstName} ${order.lastName}`)}<br>${escapeHtml(address)}</p>` : ""}
  <p>${escapeHtml(delivery)}</p>
  <p style="font-size:13px;color:#444">${escapeHtml(note)}</p>
  <p style="font-size:13px;color:#444"><a href="${escapeHtml(termsLink)}">${escapeHtml(termsLine)}</a>.</p>
  <hr style="border:none;border-top:1px solid #ddd">
  <p style="font-size:12px;color:#666">${escapeHtml(company.legalName)} · ${escapeHtml(company.address)}<br>
    Ondernemingsnummer ${escapeHtml(company.enterpriseNumber)} · btw ${escapeHtml(company.vatNumber)}<br>
    ${escapeHtml(company.email)}</p>
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
    ...(address ? [`Leveradres: ${order.firstName} ${order.lastName}, ${address}`, ""] : []),
    delivery,
    "",
    note,
    `${termsLine}: ${termsLink}`,
    "",
    `${company.legalName} · ${company.address} · ondernemingsnummer ${company.enterpriseNumber} · btw ${company.vatNumber} · ${company.email}`,
  ].join("\n");

  return { subject, html, text };
}
