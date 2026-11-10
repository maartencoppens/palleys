"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { editionPriceCents } from "@/core/modules/catalog/utils";
import type { CollectibleView } from "@/core/modules/collectibles/types";
import { postManualOrder } from "@/core/modules/orders/api";
import type { ManualOrderRequest } from "@/core/modules/orders/types";
import { uploadAdminPhoto } from "@/core/modules/previews/api";
import type { CatalogSettings } from "@/core/modules/settings/types";
import { getApiErrorMessage } from "@/core/networking/api";
import { formatPrice, fromEuroInput, toEuroInput } from "@/core/utils/format";
import Button from "@/components/design/Button";
import { Input, Textarea } from "@/components/design/form";
import { compactFieldClassName, fieldLabelClassName } from "@/components/functional/admin/settings/SettingsParts";
import { attachments, editions, type Attachment, type Edition } from "@/data/options";
import type { AnimalOption } from "@/core/modules/animals/types";
import { MANUAL_PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type ManualPaymentMethod } from "@/data/payment-methods";
import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from "@/data/pricing";
import { ALLOWED_IMAGE_TYPES, MAX_PHOTOS_PER_PREVIEW, MAX_UPLOAD_BYTES } from "@/data/uploads";

export type ManualOrderDeliveryOption = { id: string; label: string; priceCents: number };

type ManualOrderFormProps = {
  catalog: CatalogSettings;
  collectibles: CollectibleView[];
  deliveryOptions: ManualOrderDeliveryOption[];
  /** False until Bancontact Pro is approved and its keys are set. */
  paymentsAvailable: boolean;
};

// `price` stays null until the admin types one: until then the line follows the current list price.
type PersonalizedLine = {
  key: number;
  kind: "personalized";
  animal: string;
  edition: Edition;
  attachment: Attachment;
  quantity: number;
  price: string | null;
  notes: string;
  photos: File[];
};
type CollectibleLine = {
  key: number;
  kind: "collectible";
  collectibleId: string;
  edition: Edition;
  attachment: Attachment;
  quantity: number;
  price: string | null;
  notes: string;
};
type Line = PersonalizedLine | CollectibleLine;

type PaymentChoice = "bancontact" | "paid" | "later";
type UploadFailure = { orderId: string; number: string; failed: number };

const selectClassName =
  "h-11 w-full rounded-[15px] bg-off-white-dark px-4 font-label text-base font-semibold text-medium-green outline-none focus-visible:ring-3 focus-visible:ring-accent-highlights";
const cardClassName = "rounded-3xl bg-white p-6 md:p-8";
const cardTitleClassName = "font-display text-2xl font-medium text-medium-green";

/*
 * Adds an order for someone who doesn't go through the website, e.g. a friend. Everything is sent to the server, which
 * recomputes the totals; the sums here are only a preview. Photos go up after the order exists, using the same upload as
 * the preview page, so a failed upload loses nothing: the order stands and the photo can be added from there.
 *
 * A stock order is the other kind: collectibles we have printed ahead, for nobody yet. It needs no customer, delivery
 * or payment (the server fills those in); finishing it adds the copies to the collectible's stock.
 */
export function ManualOrderForm({ catalog, collectibles, deliveryOptions, paymentsAvailable }: ManualOrderFormProps) {
  const router = useRouter();
  const [stockOrder, setStockOrder] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nextKey, setNextKey] = useState(1);
  const [lines, setLines] = useState<Line[]>([newPersonalizedLine(0, catalog.animals)]);
  const [deliveryType, setDeliveryType] = useState<"handover" | "ship">("handover");
  const [optionId, setOptionId] = useState(deliveryOptions[0]?.id ?? "");
  const [shippingPrice, setShippingPrice] = useState<string | null>(null);
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [payment, setPayment] = useState<PaymentChoice>(paymentsAvailable ? "bancontact" : "later");
  const [method, setMethod] = useState<ManualPaymentMethod>("cash");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadFailure, setUploadFailure] = useState<UploadFailure | null>(null);

  const option = deliveryOptions.find((row) => row.id === optionId);

  function listPrice(line: Line) {
    if (line.kind === "personalized") return editionPriceCents(line.edition, catalog.prices);
    return collectibles.find((row) => row.id === line.collectibleId)?.priceCents ?? 0;
  }

  const unitCents = (line: Line) => (line.price === null ? listPrice(line) : fromEuroInput(line.price));
  const shippingCents = deliveryType === "handover" ? 0 : shippingPrice === null ? (option?.priceCents ?? 0) : fromEuroInput(shippingPrice);

  const totalCents = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + (unitCents(line) ?? 0) * line.quantity, 0);
    return subtotal + (shippingCents ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, shippingCents]);

  function addLine(line: Line) {
    setLines((current) => [...current, line]);
    setNextKey((key) => key + 1);
  }
  function updateLine(key: number, patch: Partial<PersonalizedLine> & Partial<CollectibleLine>) {
    setLines((current) => current.map((line) => (line.key === key ? ({ ...line, ...patch } as Line) : line)));
  }

  /** Switching to a stock order keeps only the collectibles, and starts with one when there were none. */
  function chooseStockOrder(value: boolean) {
    setStockOrder(value);
    if (!value) return;
    setLines((current) => {
      const kept = current.filter((line) => line.kind === "collectible");
      return kept.length > 0 || collectibles.length === 0 ? kept : [newCollectibleLine(nextKey, collectibles)];
    });
    setNextKey((key) => key + 1);
  }

  function validate() {
    if (!stockOrder && (!firstName.trim() || !lastName.trim())) return "Vul de naam van de klant in";
    if (lines.length === 0) return "Voeg minstens één product toe";
    if (stockOrder && lines.some((line) => line.kind !== "collectible")) return "Een voorraadorder bevat alleen collectibles";
    if (lines.some((line) => unitCents(line) === null)) return "Een van de prijzen klopt niet (bv. 27,99)";
    if (lines.some((line) => line.kind === "collectible" && !line.collectibleId)) return "Kies een collectible";
    for (const line of lines) {
      if (line.kind !== "personalized") continue;
      if (line.photos.length > MAX_PHOTOS_PER_PREVIEW) return `Maximaal ${MAX_PHOTOS_PER_PREVIEW} foto's per Palley`;
      if (line.photos.some((photo) => photo.size > MAX_UPLOAD_BYTES)) return "Een van de foto's is groter dan 10 MB";
    }
    if (!stockOrder && deliveryType === "ship") {
      if (!option) return "Er is geen verzendoptie beschikbaar";
      if (shippingCents === null) return "De verzendprijs klopt niet (bv. 4,95)";
      if (!street.trim() || !houseNumber.trim() || !city.trim()) return "Vul het volledige leveradres in";
      if (!/^[1-9]\d{3}$/.test(postalCode.trim())) return "Vul een Belgische postcode in";
    }
    if (!stockOrder && payment === "bancontact" && totalCents <= 0) return "Een gratis order kan niet met Bancontact: kies “Al betaald” en “Geschenk”";
    return null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const problem = validate();
    if (problem) return setError(problem);

    const request: ManualOrderRequest = {
      stockOrder,
      // A stock order's customer, delivery and payment are filled in by the server.
      customer: stockOrder ? { firstName: "Palleys", lastName: "Voorraad" } : { firstName, lastName, email: email.trim(), phone: phone.trim() },
      lines: lines.map((line) => {
        const shared = {
          quantity: line.quantity,
          unitCents: line.price === null ? undefined : fromEuroInput(line.price)!,
          notes: line.notes,
        };
        return line.kind === "personalized"
          ? { kind: line.kind, animal: line.animal, edition: line.edition, attachment: line.attachment, ...shared }
          : { kind: line.kind, collectibleId: line.collectibleId, edition: line.edition, attachment: line.attachment, ...shared };
      }),
      delivery:
        stockOrder || deliveryType === "handover"
          ? { type: "handover" }
          : {
              type: "ship",
              optionId,
              priceCents: shippingPrice === null ? undefined : shippingCents!,
              street,
              houseNumber,
              postalCode: postalCode.trim(),
              city,
            },
      payment: stockOrder ? { type: "later" } : payment === "paid" ? { type: "paid", method } : { type: payment },
      sendConfirmation: !stockOrder && payment === "paid" && sendConfirmation && Boolean(email.trim()),
      note,
    };

    setStatus("Order aanmaken…");
    try {
      const result = await postManualOrder(request);

      const uploads = result.previews.flatMap(({ lineIndex, previewId }) => {
        const line = lines[lineIndex];
        return line.kind === "personalized" ? line.photos.map((photo) => ({ previewId, photo })) : [];
      });
      let failed = 0;
      for (const [index, upload] of uploads.entries()) {
        setStatus(`Foto ${index + 1} van ${uploads.length} uploaden…`);
        try {
          await uploadAdminPhoto(upload.previewId, upload.photo);
        } catch {
          failed++;
        }
      }
      if (failed > 0) {
        setUploadFailure({ orderId: result.orderId, number: result.number, failed });
        setStatus(null);
        return;
      }
      router.push(`/admin/orders/${result.orderId}`);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
      setStatus(null);
    }
  }

  if (uploadFailure) {
    return (
      <section role="alert" className={`${cardClassName} flex flex-col items-start gap-4`}>
        <h2 className={cardTitleClassName}>Order {uploadFailure.number} is aangemaakt</h2>
        <p className="text-base">
          {uploadFailure.failed === 1 ? "1 foto kon" : `${uploadFailure.failed} foto's konden`} niet geüpload worden. Voeg ze toe via de
          preview op de orderpagina.
        </p>
        <Button variant="primary" href={`/admin/orders/${uploadFailure.orderId}`}>
          Naar de order
        </Button>
      </section>
    );
  }

  const busy = status !== null;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <section className={cardClassName}>
          <h2 className={cardTitleClassName}>Soort order</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Radio name="order-kind" checked={!stockOrder} onChange={() => chooseStockOrder(false)}>
              Voor een klant
            </Radio>
            <Radio name="order-kind" checked={stockOrder} disabled={collectibles.length === 0} onChange={() => chooseStockOrder(true)}>
              Voorraadorder: collectibles op voorhand laten maken
              <span className="block text-sm font-normal text-text-muted">
                Zonder klant en zonder betaling. Hij gaat meteen naar productie; rond je hem af, dan komen de exemplaren bij de
                voorraad van de collectible.
              </span>
            </Radio>
          </div>
        </section>

        {!stockOrder && (
          <section className={cardClassName}>
            <h2 className={cardTitleClassName}>Klant</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Voornaam" id="first-name">
                <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={compactFieldClassName} />
              </Field>
              <Field label="Achternaam" id="last-name">
                <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={compactFieldClassName} />
              </Field>
              <Field label="E-mail (optioneel)" id="email">
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={compactFieldClassName} />
              </Field>
              <Field label="Telefoon (optioneel)" id="phone">
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={compactFieldClassName} />
              </Field>
            </div>
          </section>
        )}

        <section className={cardClassName}>
          <h2 className={cardTitleClassName}>Producten</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {lines.map((line, index) => (
              <li key={line.key} className="flex flex-col gap-4 rounded-2xl border-[1.5px] border-off-white-dark p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-label text-base font-bold">
                    {line.kind === "personalized" ? "Gepersonaliseerde Palley" : "Collectible"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}
                    className="rounded font-label text-sm font-bold text-[#a3341a] underline underline-offset-4"
                  >
                    Verwijderen
                  </button>
                </div>

                {line.kind === "personalized" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Dier" id={`animal-${index}`}>
                      <select
                        id={`animal-${index}`}
                        value={line.animal}
                        onChange={(e) => updateLine(line.key, { animal: e.target.value })}
                        className={selectClassName}
                      >
                        {catalog.animals.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.labels.nl}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Uitvoering" id={`edition-${index}`}>
                      <select
                        id={`edition-${index}`}
                        value={line.edition}
                        onChange={(e) => updateLine(line.key, { edition: e.target.value as Edition })}
                        className={selectClassName}
                      >
                        {editions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {line.edition === "keychain" && (
                      <Field label="Bevestiging" id={`attachment-${index}`}>
                        <select
                          id={`attachment-${index}`}
                          value={line.attachment}
                          onChange={(e) => updateLine(line.key, { attachment: e.target.value as Attachment })}
                          className={selectClassName}
                        >
                          {attachments.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Product" id={`collectible-${index}`}>
                      <select
                        id={`collectible-${index}`}
                        value={line.collectibleId}
                        onChange={(e) => updateLine(line.key, { collectibleId: e.target.value, price: null })}
                        className={selectClassName}
                      >
                        {collectibles.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                            {option.soldOut ? " (uitverkocht)" : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Uitvoering" id={`edition-${index}`}>
                      <select
                        id={`edition-${index}`}
                        value={line.edition}
                        onChange={(e) => updateLine(line.key, { edition: e.target.value as Edition })}
                        className={selectClassName}
                      >
                        {editions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {line.edition === "keychain" && (
                      <Field label="Bevestiging" id={`attachment-${index}`}>
                        <select
                          id={`attachment-${index}`}
                          value={line.attachment}
                          onChange={(e) => updateLine(line.key, { attachment: e.target.value as Attachment })}
                          className={selectClassName}
                        >
                          {attachments.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Aantal" id={`quantity-${index}`}>
                    <Input
                      id={`quantity-${index}`}
                      type="number"
                      min={1}
                      max={MAX_LINE_QUANTITY}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.key, {
                          quantity: Math.min(MAX_LINE_QUANTITY, Math.max(1, Number.parseInt(e.target.value, 10) || 1)),
                        })
                      }
                      className={compactFieldClassName}
                    />
                  </Field>
                  {!stockOrder && (
                      <Field label="Prijs per stuk (€)" id={`price-${index}`}>
                        <Input
                          id={`price-${index}`}
                          inputMode="decimal"
                          value={line.price ?? toEuroInput(listPrice(line))}
                          onChange={(e) => updateLine(line.key, { price: e.target.value })}
                          className={compactFieldClassName}
                        />
                      </Field>
                  )}
                </div>

                {line.kind === "personalized" && (
                  <Field label={`Foto's van het dier (maximaal ${MAX_PHOTOS_PER_PREVIEW}, kan ook later)`} id={`photos-${index}`}>
                    <input
                      id={`photos-${index}`}
                      type="file"
                      multiple
                      accept={ALLOWED_IMAGE_TYPES.join(",")}
                      onChange={(e) => updateLine(line.key, { photos: Array.from(e.target.files ?? []) })}
                      className="block w-full text-sm file:mr-3 file:rounded-full file:border-[1.5px] file:border-medium-green file:bg-white file:px-4 file:py-2 file:font-label file:font-semibold file:text-medium-green"
                    />
                  </Field>
                )}

                <Field label="Opmerking (optioneel)" id={`notes-${index}`}>
                  <Input
                    id={`notes-${index}`}
                    value={line.notes}
                    onChange={(e) => updateLine(line.key, { notes: e.target.value })}
                    placeholder={line.kind === "personalized" ? "Vlekjes, kleur van de ogen…" : undefined}
                    className={compactFieldClassName}
                  />
                </Field>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            {!stockOrder && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={lines.length >= MAX_ORDER_LINES}
                  onClick={() => addLine(newPersonalizedLine(nextKey, catalog.animals))}
                >
                  Gepersonaliseerde Palley
                </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              disabled={lines.length >= MAX_ORDER_LINES || collectibles.length === 0}
              onClick={() => addLine(newCollectibleLine(nextKey, collectibles))}
            >
              Collectible
            </Button>
          </div>
          {collectibles.length === 0 && (
            <p className="mt-2 text-sm text-text-muted">
              Nog geen collectibles:{" "}
              <Link href="/admin/settings/collectibles/new" className="font-semibold underline underline-offset-4">
                voeg ze toe in de instellingen
              </Link>
              .
            </p>
          )}
        </section>

        {!stockOrder && (
          <>
            <section className={cardClassName}>
              <h2 className={cardTitleClassName}>Levering</h2>
              <div className="mt-4 flex flex-col gap-3">
                <Radio name="delivery" checked={deliveryType === "handover"} onChange={() => setDeliveryType("handover")}>
                  Zelf overhandigen (geen adres, geen verzendkosten)
                </Radio>
                <Radio name="delivery" checked={deliveryType === "ship"} onChange={() => setDeliveryType("ship")}>
                  Opsturen
                </Radio>
              </div>
              {deliveryType === "ship" && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Verzendoptie" id="delivery-option">
                    <select
                      id="delivery-option"
                      value={optionId}
                      onChange={(e) => {
                        setOptionId(e.target.value);
                        setShippingPrice(null);
                      }}
                      className={selectClassName}
                    >
                      {deliveryOptions.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Verzendprijs (€)" id="shipping-price">
                    <Input
                      id="shipping-price"
                      inputMode="decimal"
                      value={shippingPrice ?? toEuroInput(option?.priceCents ?? 0)}
                      onChange={(e) => setShippingPrice(e.target.value)}
                      className={compactFieldClassName}
                    />
                  </Field>
                  <Field label="Straat" id="street">
                    <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} className={compactFieldClassName} />
                  </Field>
                  <Field label="Nummer" id="house-number">
                    <Input id="house-number" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} className={compactFieldClassName} />
                  </Field>
                  <Field label="Postcode" id="postal-code">
                    <Input id="postal-code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={compactFieldClassName} />
                  </Field>
                  <Field label="Gemeente" id="city">
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className={compactFieldClassName} />
                  </Field>
                </div>
              )}
            </section>

            <section className={cardClassName}>
              <h2 className={cardTitleClassName}>Betaling</h2>
              <div className="mt-4 flex flex-col gap-3">
                <Radio name="payment" checked={payment === "bancontact"} disabled={!paymentsAvailable} onChange={() => setPayment("bancontact")}>
                  Bancontact: de klant betaalt met de app via een betaallink
                  {!paymentsAvailable && <span className="block text-sm font-normal text-text-muted">Nog niet gekoppeld: we wachten op de goedkeuring van Bancontact Pro.</span>}
                </Radio>
                <Radio name="payment" checked={payment === "later"} onChange={() => setPayment("later")}>
                  Later betalen: de order blijft open tot je ze als betaald markeert of een betaallink maakt
                </Radio>
                <Radio name="payment" checked={payment === "paid"} onChange={() => setPayment("paid")}>
                  Al betaald
                </Radio>
                {payment === "paid" && (
                  <div className="ml-8 sm:max-w-xs">
                    <Field label="Hoe?" id="payment-method">
                      <select
                        id="payment-method"
                        value={method}
                        onChange={(e) => setMethod(e.target.value as ManualPaymentMethod)}
                        className={selectClassName}
                      >
                        {MANUAL_PAYMENT_METHODS.map((value) => (
                          <option key={value} value={value}>
                            {PAYMENT_METHOD_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}
              </div>
              <p className="mt-4 text-sm text-text-muted">
                Gepersonaliseerde Palleys verschijnen in “Te reviewen” zodra de order betaald is.
              </p>
            </section>
          </>
        )}
      </div>

      <aside className={`${cardClassName} flex h-fit flex-col gap-4 lg:sticky lg:top-6`}>
        <h2 className={cardTitleClassName}>Overzicht</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {lines.map((line) => (
            <li key={line.key} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {line.quantity} × {lineName(line, collectibles, catalog.animals)}
              </span>
              {!stockOrder && <span className="tabular-nums">{formatPrice(((unitCents(line) ?? 0) * line.quantity) / 100)}</span>}
            </li>
          ))}
          {!stockOrder && (
              <li className="flex justify-between gap-3">
                <span>Verzending</span>
                <span className="tabular-nums">{formatPrice((shippingCents ?? 0) / 100)}</span>
              </li>
          )}
        </ul>
        {stockOrder ? (
          <p className="border-t border-off-white-dark pt-3 text-sm text-text-muted">
            Voorraadorder: geen prijs en geen betaling. Hij komt meteen in de printwachtrij; rond je hem af, dan staan de
            exemplaren bij de voorraad.
          </p>
        ) : (
          <>
            <p className="flex items-baseline justify-between border-t border-off-white-dark pt-3 font-label text-medium-green">
              <span className="font-display text-xl font-medium">Totaal</span>
              <span className="text-2xl font-extrabold tabular-nums">{formatPrice(totalCents / 100)}</span>
            </p>

            {payment === "paid" ? (
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={sendConfirmation && Boolean(email.trim())}
                  disabled={!email.trim()}
                  onChange={(e) => setSendConfirmation(e.target.checked)}
                  className="mt-0.5 size-4 accent-medium-green"
                />
                <span>
                  Bevestigingsmail sturen
                  {!email.trim() && <span className="block text-xs text-text-muted">Vul een e-mailadres in om dit te gebruiken.</span>}
                </span>
              </label>
            ) : (
              <p className="text-sm text-text-muted">
                {email.trim()
                  ? payment === "bancontact"
                    ? "De klant krijgt een bevestigingsmail zodra de betaling binnen is."
                    : "Je kiest of er een bevestigingsmail vertrekt wanneer je de order als betaald markeert."
                  : "Zonder e-mailadres krijgt de klant geen bevestigingsmail."}
              </p>
            )}
          </>
        )}

        <div>
          <label htmlFor="order-note" className={fieldLabelClassName}>
            Interne notitie (optioneel)
          </label>
          <Textarea
            id="order-note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="bv. Vriend van Maarten, opgehaald op school"
            className="mt-2 min-h-16 text-base!"
          />
        </div>

        <Button type="submit" variant="primary" className="w-full" loading={busy} loadingText={status ?? "Bezig…"}>
          {stockOrder ? "Voorraadorder starten" : "Order toevoegen"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-[#a3341a]">
            {error}
          </p>
        )}
      </aside>
    </form>
  );
}

function newPersonalizedLine(key: number, animals: AnimalOption[]): PersonalizedLine {
  return { key, kind: "personalized", animal: animals[0].value, edition: "keychain", attachment: attachments[0].value, quantity: 1, price: null, notes: "", photos: [] };
}

function newCollectibleLine(key: number, collectibles: CollectibleView[]): CollectibleLine {
  return { key, kind: "collectible", collectibleId: collectibles[0].id, edition: "keychain", attachment: attachments[0].value, quantity: 1, price: null, notes: "" };
}

function lineName(line: Line, collectibles: CollectibleView[], animals: AnimalOption[]) {
  if (line.kind === "collectible") {
    const name = collectibles.find((row) => row.id === line.collectibleId)?.name ?? "Collectible";
    return line.edition === "figure" ? `${name} (figuurtje)` : name;
  }
  return `Palley ${animals.find((animal) => animal.value === line.animal)?.labels.nl ?? ""}`;
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className={fieldLabelClassName}>
        {label}
      </label>
      {children}
    </div>
  );
}

type RadioProps = { name: string; checked: boolean; disabled?: boolean; onChange: () => void; children: React.ReactNode };

function Radio({ name, checked, disabled, onChange, children }: RadioProps) {
  return (
    <label className={`flex items-start gap-3 text-base font-semibold ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-1 size-5 shrink-0 accent-medium-green"
      />
      <span>{children}</span>
    </label>
  );
}
