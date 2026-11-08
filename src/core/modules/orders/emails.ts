import { formatPrice } from "@/core/utils/format";
import { localizedPath, toLocale, type Locale } from "@/core/locale/config";
import { fill } from "@/core/locale/fill";
import { MESSAGES, type Messages } from "@/core/locale/messages";
import { COMPANY } from "@/data/company";
import { TERMS_URL } from "@/data/checkout";
import type { Attachment, Edition } from "@/data/options";
import { DEFAULT_ANIMALS } from "@/data/animals";
import { findAnimal } from "@/core/modules/animals/utils";
import type { AnimalOption } from "@/core/modules/animals/types";
import { DEFAULT_SITE_CONTENT } from "@/data/site-content";
import { localizedTexts } from "@/core/modules/collectibles/translations";

/*
 * Order confirmation mail: the "durable medium" consumer law asks for (order, totals, company details, terms
 * version, withdrawal exception), in the language the customer ordered in. Pure: builds subject/html/text, sending
 * happens in payments/service.ts. Every customer-supplied value is HTML-escaped.
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
  discountCents: number;
  discountCode: string | null;
  shippingCents: number;
  totalCents: number;
  locale: string;
  /** Null when an admin added the order: the customer never saw the checkbox. */
  termsVersion: string | null;
  items: {
    title: string;
    animal: string | null;
    edition: string | null;
    attachment: string | null;
    quantity: number;
    unitCents: number;
    notes: string | null;
    withdrawable: boolean;
    /** Its names in the other languages; the title holds the Dutch one. */
    collectible?: { translations: unknown } | null;
  }[];
  shipment: { label: string; deliveryType: string; deliveryOptionId: string } | null;
};

type ConfirmationSettings = {
  company?: Pick<typeof COMPANY, "legalName" | "address" | "enterpriseNumber" | "email">;
  deliveryTime?: string;
  /** The live animal list, for the animal's name in the customer's language. */
  animals?: AnimalOption[];
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function withdrawalNote(items: ConfirmationOrder["items"], m: Messages["email"]) {
  const personalized = items.some((item) => !item.withdrawable);
  const collectible = items.some((item) => item.withdrawable);
  return [personalized && m.noWithdrawal, collectible && m.withdrawal, m.guarantee].filter(Boolean).join(" ");
}

/** OrderItem.title is Dutch for the backoffice: a Palley is named from its options, a collectible keeps its name and adds its attachment. */
function itemTitle(item: ConfirmationOrder["items"][number], messages: Messages, locale: Locale, animals: AnimalOption[]) {
  const { editions, attachments } = messages.options;
  if (!item.animal || !item.edition) {
    const name = item.collectible
      ? localizedTexts({ name: item.title, description: null, tag: null, translations: item.collectible.translations }, locale).name
      : item.title;
    return [name, item.attachment ? (attachments[item.attachment as Attachment] ?? item.attachment) : null].filter(Boolean).join(" · ");
  }
  return [
    // A removed animal: the order still has its Dutch title.
    fill(messages.email.itemTitle, { animal: findAnimal(animals, item.animal)?.labels[locale] ?? item.animal }),
    editions[item.edition as Edition] ?? item.edition,
    item.attachment ? (attachments[item.attachment as Attachment] ?? item.attachment) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function buildOrderConfirmation(
  order: ConfirmationOrder,
  appUrl: string,
  { company = COMPANY, deliveryTime, animals = DEFAULT_ANIMALS }: ConfirmationSettings = {},
) {
  const locale = toLocale(order.locale);
  const messages = MESSAGES[locale];
  const m = messages.email;
  const euro = (cents: number) => formatPrice(cents / 100, locale);
  const time = deliveryTime ?? DEFAULT_SITE_CONTENT[locale].deliveryTime;

  const termsPath = localizedPath(TERMS_URL, locale);
  const termsLink = `${appUrl}${termsPath}${order.termsVersion ? `?versie=${encodeURIComponent(order.termsVersion)}` : ""}`;
  const subject = fill(m.subject, { number: order.number });
  const title = fill(m.title, { name: order.firstName });
  const address = order.street ? `${order.street} ${order.houseNumber}, ${order.postalCode} ${order.city}, ${order.country}` : null;
  const deliveryType = order.shipment?.deliveryType;
  const note = withdrawalNote(order.items, m);
  const allCollectibles = order.items.every((item) => item.withdrawable);
  const delivery = deliveryType === "HANDOVER"
    ? m.deliveryHandover
    : deliveryType === "PICKUP"
      ? m.deliveryPickup
      : fill(allCollectibles ? m.deliveryCollectible : m.deliveryPersonalized, { deliveryTime: time });
  const termsLine = order.termsVersion ? fill(m.termsAccepted, { version: order.termsVersion }) : m.termsApply;
  const shipmentLabel = order.shipment
    ? (messages.shipping.options[order.shipment.deliveryOptionId]?.label ?? order.shipment.label)
    : null;
  const shippingLine = `${m.shipping}${shipmentLabel ? ` (${shipmentLabel})` : ""}`;
  const shippingAmount = order.shippingCents === 0 ? messages.shipping.free : euro(order.shippingCents);
  const discountLine = order.discountCents > 0 ? `${m.discount}${order.discountCode ? ` (${order.discountCode})` : ""}` : null;

  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0">${escapeHtml(itemTitle(item, messages, locale, animals))} × ${item.quantity}${
            item.notes ? `<br><span style="color:#666;font-size:13px">“${escapeHtml(item.notes)}”</span>` : ""
          }</td>
          <td style="padding:8px 0;text-align:right;white-space:nowrap">${euro(item.unitCents * item.quantity)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="${locale}"><body style="font-family:Arial,sans-serif;color:#1f2d24;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="font-size:22px">${escapeHtml(title)}</h1>
  <p>${escapeHtml(m.intro)}</p>
  <p><strong>${escapeHtml(m.orderNumber)}:</strong> ${escapeHtml(order.number)}</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #ddd;border-bottom:1px solid #ddd">${rows}${
    discountLine
      ? `
    <tr><td style="padding:8px 0">${escapeHtml(discountLine)}</td>
        <td style="padding:8px 0;text-align:right">- ${euro(order.discountCents)}</td></tr>`
      : ""
  }
    <tr><td style="padding:8px 0">${escapeHtml(shippingLine)}</td>
        <td style="padding:8px 0;text-align:right">${escapeHtml(shippingAmount)}</td></tr>
    <tr><td style="padding:8px 0"><strong>${escapeHtml(m.total)}</strong></td>
        <td style="padding:8px 0;text-align:right"><strong>${euro(order.totalCents)}</strong></td></tr>
  </table>
  <p style="font-size:13px;color:#444">${escapeHtml(m.vatExempt)}</p>
  ${address ? `<p><strong>${escapeHtml(m.address)}:</strong><br>${escapeHtml(`${order.firstName} ${order.lastName}`)}<br>${escapeHtml(address)}</p>` : ""}
  <p>${escapeHtml(delivery)}</p>
  <p style="padding:12px;background:#f6d56b33;border-radius:8px"><strong>${escapeHtml(messages.common.heatWarning)}</strong></p>
  <p style="font-size:13px;color:#444">${escapeHtml(note)}</p>
  <p style="font-size:13px;color:#444"><a href="${escapeHtml(termsLink)}">${escapeHtml(termsLine)}</a>.</p>
  <hr style="border:none;border-top:1px solid #ddd">
  <p style="font-size:12px;color:#666">${escapeHtml(company.legalName)} · ${escapeHtml(company.address)}<br>
    ${company.enterpriseNumber ? `${escapeHtml(m.enterprise)} ${escapeHtml(company.enterpriseNumber)}<br>` : ""}
    ${escapeHtml(company.email)}</p>
</body></html>`;

  const text = [
    title,
    "",
    m.intro,
    `${m.orderNumber}: ${order.number}`,
    "",
    ...order.items.map((item) => `- ${itemTitle(item, messages, locale, animals)} × ${item.quantity}: ${euro(item.unitCents * item.quantity)}`),
    ...(discountLine ? [`${discountLine}: - ${euro(order.discountCents)}`] : []),
    `${shippingLine}: ${shippingAmount}`,
    `${m.total}: ${euro(order.totalCents)}`,
    m.vatExempt,
    "",
    ...(address ? [`${m.address}: ${order.firstName} ${order.lastName}, ${address}`, ""] : []),
    delivery,
    "",
    messages.common.heatWarning,
    "",
    note,
    `${termsLine}: ${termsLink}`,
    "",
    [company.legalName, company.address, company.enterpriseNumber && `${m.enterprise} ${company.enterpriseNumber}`, company.email]
      .filter(Boolean)
      .join(" · "),
  ].join("\n");

  return { subject, html, text };
}

export type PickupMailOrder = { number: string; firstName: string; locale: string };

/**
 * Mails for an order picked up on campus: "ready" once, when everything is checked in, and "update" as often as the
 * team needs (when they'll be there), with a message the admin writes per language. Pure, like the confirmation.
 */
export function buildPickupMail(
  kind: "ready" | "update",
  order: PickupMailOrder,
  { company = COMPANY, message }: { company?: Pick<typeof COMPANY, "legalName" | "address" | "email">; message?: string } = {},
) {
  const locale = toLocale(order.locale);
  const m = MESSAGES[locale].pickupEmail;
  const values = { number: order.number, name: order.firstName, location: m.location };
  const subject = fill(kind === "ready" ? m.readySubject : m.updateSubject, values);
  const title = fill(kind === "ready" ? m.readyTitle : m.updateTitle, values);
  const body = kind === "ready" ? [fill(m.readyText, values)] : [fill(m.updateIntro, values), (message ?? "").trim()];
  if (kind === "update" && !body[1]) throw new Error("A pickup update needs a message");

  const paragraphs = body.map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`).join("\n  ");
  const html = `<!doctype html>
<html lang="${locale}"><body style="font-family:Arial,sans-serif;color:#1f2d24;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="font-size:22px">${escapeHtml(title)}</h1>
  ${paragraphs}
  <p>${escapeHtml(m.footer)}</p>
  <hr style="border:none;border-top:1px solid #ddd">
  <p style="font-size:12px;color:#666">${escapeHtml(company.legalName)} · ${escapeHtml(company.address)}<br>${escapeHtml(company.email)}</p>
</body></html>`;
  const text = [title, "", ...body.flatMap((paragraph) => [paragraph, ""]), m.footer, "", [company.legalName, company.address, company.email].join(" · ")].join("\n");
  return { subject, html, text };
}
