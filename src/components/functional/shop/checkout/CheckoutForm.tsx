"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Button from "@/components/design/Button";
import { Input, Label } from "@/components/design/form";
import { Badge } from "@/components/design/Badge";
import CartLinePhoto from "@/components/functional/shop/cart/CartLinePhoto";
import { COLLECTIBLE_RETURN_NOTE } from "@/data/collectibles";
import { loadCart, useCartSnapshot } from "@/core/hooks/useCartSnapshot";
import { fetchCheckoutConfig, postCheckout, postDeliveryOptions } from "@/core/modules/checkout/api";
import type { CheckoutConfig, DeliveryOptionView } from "@/core/modules/checkout/types";
import { formatPrice } from "@/core/utils/format";
import { FIELD_LIMITS, PRIVACY_URL, TERMS_URL } from "@/data/checkout";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/data/payment-methods";
import { POSTAL_CODE_PATTERNS, type ShippingCountry } from "@/data/shipping";
import DeliveryOptionsPicker from "./DeliveryOptionsPicker";

const errorClassName = "font-label text-base font-semibold text-[#a3341a]";
const labelClassName = "text-base md:text-lg";
const inputClassName = "h-12 text-base md:h-14 md:text-lg";

type Fields = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: ShippingCountry;
};
type FieldName = keyof Fields | "deliveryOptionId" | "acceptTerms";

const EMPTY: Fields = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: "BE",
};

const FIELD_ERRORS: Record<FieldName, string> = {
  email: "Vul een geldig e-mailadres in.",
  firstName: "Vul je voornaam in.",
  lastName: "Vul je achternaam in.",
  phone: "Dat telefoonnummer lijkt niet te kloppen.",
  street: "Vul je straat in.",
  houseNumber: "Vul je huisnummer in.",
  postalCode: "Vul een geldige postcode in.",
  city: "Vul je gemeente in.",
  country: "Kies een land.",
  deliveryOptionId: "Kies hoe je je Palley wil ontvangen.",
  acceptTerms: "Vink dit aan om je bestelling te plaatsen.",
};

const SUBMIT_ERRORS: Record<string, string> = {
  checkout_closed: "Bestellen is op dit moment niet mogelijk.",
  payments_unavailable: "Betalen is tijdelijk niet mogelijk. Probeer het later opnieuw.",
  cart_empty: "Je winkelmandje is leeg.",
  preview_not_orderable: "Een van je uploads is verlopen. Ga terug naar je winkelmandje en voeg je foto’s opnieuw toe.",
  delivery_option_invalid: "Deze verzendoptie is niet meer beschikbaar. Kies opnieuw.",
  payment_failed: "We konden de betaling niet starten. Probeer het nog eens.",
  rate_limited: "Te veel pogingen. Wacht een paar minuten en probeer opnieuw.",
  invalid_input: "Controleer de gemarkeerde velden.",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientErrors(fields: Fields, deliveryOptionId: string | null, acceptTerms: boolean) {
  const errors = new Set<FieldName>();
  if (!EMAIL_PATTERN.test(fields.email.trim())) errors.add("email");
  for (const name of ["firstName", "lastName", "street", "houseNumber", "city"] as const) {
    if (!fields[name].trim()) errors.add(name);
  }
  if (!POSTAL_CODE_PATTERNS[fields.country].test(fields.postalCode.trim())) errors.add("postalCode");
  if (fields.phone && !/^[+0-9 ()./-]*$/.test(fields.phone)) errors.add("phone");
  if (!deliveryOptionId) errors.add("deliveryOptionId");
  if (!acceptTerms) errors.add("acceptTerms");
  return errors;
}

/*
 * Checkout: details, delivery and a clear "order with obligation to pay" step, then Bancontact's hosted page.
 * Only details and choices are sent; the server computes every amount again and refuses anything stale.
 */
export default function CheckoutForm({ deliveryTime }: { deliveryTime: string }) {
  const { cart, loaded } = useCartSnapshot();
  const [cartFailed, setCartFailed] = useState(false);
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [options, setOptions] = useState<DeliveryOptionView[]>([]);
  const [optionsStatus, setOptionsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [deliveryOptionId, setDeliveryOptionId] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [errors, setErrors] = useState<Set<FieldName>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCart().catch(() => setCartFailed(true));
    fetchCheckoutConfig()
      .then(setConfig)
      .catch(() => setConfig({ enabled: true, closedMessage: null, paymentsAvailable: true }));
  }, []);

  // Coming back from Bancontact with the back button restores the page: re-enable the button.
  useEffect(() => {
    const onPageShow = () => setSubmitting(false);
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const postalValid = POSTAL_CODE_PATTERNS[fields.country].test(fields.postalCode.trim());

  // Delivery options follow the country and postal code, a moment after typing stops.
  useEffect(() => {
    if (!postalValid) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setOptionsStatus("loading");
      postDeliveryOptions({ country: fields.country, postalCode: fields.postalCode.trim() })
        .then((next) => {
          if (cancelled) return;
          setOptions(next);
          setOptionsStatus("ready");
          setDeliveryOptionId((current) =>
            next.some((option) => option.id === current) ? current : next.length === 1 ? next[0].id : null,
          );
        })
        .catch(() => !cancelled && setOptionsStatus("error"));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fields.country, fields.postalCode, postalValid]);

  const shownOptionsStatus = postalValid ? optionsStatus : "idle";
  const shownOptions = postalValid ? options : [];
  const selected = shownOptions.find((option) => option.id === deliveryOptionId) ?? null;
  const subtotalCents = cart?.subtotalCents ?? 0;
  const totalCents = subtotalCents + (selected?.priceCents ?? 0);

  const set = (name: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setFields((current) => ({ ...current, [name]: value }));
    if (errors.has(name)) setErrors((current) => new Set([...current].filter((n) => n !== name)));
  };

  const closed = config ? !config.enabled || !config.paymentsAvailable : false;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || closed) return;
    setSubmitError(null);
    const found = clientErrors(fields, selected?.id ?? null, acceptTerms);
    setErrors(found);
    if (found.size > 0) {
      const first = document.querySelector<HTMLElement>("[aria-invalid='true']");
      first?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const { checkoutUrl } = await postCheckout({
        ...fields,
        phone: fields.phone.trim() || undefined,
        deliveryOptionId: selected!.id,
        acceptTerms,
        marketingOptIn,
        locale: "nl",
      });
      window.location.assign(checkoutUrl);
    } catch (error) {
      setSubmitting(false);
      if (axios.isAxiosError<{ error?: string; fields?: string[] }>(error)) {
        const code = error.response?.data?.error;
        const serverFields = (error.response?.data?.fields ?? []).filter((f): f is FieldName => f in FIELD_ERRORS);
        if (serverFields.length > 0) setErrors(new Set(serverFields));
        if (code === "delivery_option_invalid") setDeliveryOptionId(null);
        setSubmitError((code && SUBMIT_ERRORS[code]) ?? "Er ging iets mis. Probeer het nog eens.");
      } else {
        setSubmitError("Er ging iets mis. Probeer het nog eens.");
      }
    }
  };

  const field = (name: keyof Fields, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name} className={labelClassName}>
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        value={fields[name]}
        onChange={set(name)}
        aria-invalid={errors.has(name) || undefined}
        aria-describedby={errors.has(name) ? `${name}-error` : undefined}
        className={inputClassName}
        {...props}
      />
      {errors.has(name) && (
        <p id={`${name}-error`} className={errorClassName}>
          {FIELD_ERRORS[name]}
        </p>
      )}
    </div>
  );

  const lines = useMemo(() => cart?.lines ?? [], [cart]);

  if (!loaded && !cartFailed) {
    return (
      <div className="h-96 animate-pulse rounded-3xl bg-white md:rounded-[32px]" role="status" aria-label="Laden" />
    );
  }
  if (cartFailed) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 rounded-3xl bg-white p-6 md:rounded-[32px] md:p-8">
        <p className="font-display text-2xl font-bold text-medium-green">We konden je winkelmandje niet laden</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Opnieuw proberen
        </Button>
      </div>
    );
  }
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-3xl bg-white p-6 md:rounded-[32px] md:p-8">
        <p className="font-display text-2xl font-bold text-medium-green">Je winkelmandje is leeg</p>
        <p className="text-base text-text-primary">Maak eerst je Palley, dan kun je hier afrekenen.</p>
        <Button variant="primary" href="/create">
          Maak je Palley
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
      <div className="flex min-w-0 flex-1 flex-col gap-6 md:gap-8">
        {closed && (
          <div role="alert" className="rounded-3xl bg-light-yellow p-5 md:p-6">
            <p className="font-label text-lg font-bold text-medium-green">
              {config && !config.enabled ? "Bestellen is even gepauzeerd" : "Betalen is tijdelijk niet mogelijk"}
            </p>
            <p className="mt-1 text-base text-text-primary">
              {config?.closedMessage ?? "Probeer het later opnieuw. Je winkelmandje blijft bewaard."}
            </p>
          </div>
        )}

        <section aria-labelledby="contact-title" className="flex flex-col gap-5 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8">
          <h2 id="contact-title" className="font-display text-2xl leading-[1.2] font-bold text-medium-green">
            Contactgegevens
          </h2>
          {field("email", "E-mailadres", {
            type: "email",
            autoComplete: "email",
            inputMode: "email",
            maxLength: FIELD_LIMITS.email,
          })}
          {field("phone", "Telefoon (optioneel, voor de vervoerder)", {
            type: "tel",
            autoComplete: "tel",
            maxLength: FIELD_LIMITS.phone,
          })}
        </section>

        <section aria-labelledby="address-title" className="flex flex-col gap-5 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8">
          <h2 id="address-title" className="font-display text-2xl leading-[1.2] font-bold text-medium-green">
            Leveradres
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {field("firstName", "Voornaam", { autoComplete: "given-name", maxLength: FIELD_LIMITS.name })}
            {field("lastName", "Achternaam", { autoComplete: "family-name", maxLength: FIELD_LIMITS.name })}
          </div>
          <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
            {field("street", "Straat", { autoComplete: "address-line1", maxLength: FIELD_LIMITS.street })}
            {field("houseNumber", "Nummer", { autoComplete: "address-line2", maxLength: FIELD_LIMITS.houseNumber })}
          </div>
          <div className="grid gap-5 sm:grid-cols-[9rem_1fr]">
            {field("postalCode", "Postcode", {
              autoComplete: "postal-code",
              maxLength: 7,
              inputMode: "numeric",
              placeholder: "9000",
            })}
            {field("city", "Gemeente", { autoComplete: "address-level2", maxLength: FIELD_LIMITS.city })}
          </div>
          {/* Belgium only for now (Bancontact). More countries: SHIPPING_COUNTRIES plus a select here. */}
          <p className="text-base text-text-primary">
            <span className={`${labelClassName} font-label font-extrabold text-medium-green`}>Land</span>
            <br />
            België <span className="text-sm text-text-muted">(we leveren voorlopig enkel in België)</span>
          </p>
        </section>

        <section aria-labelledby="delivery-title" className="flex flex-col gap-5 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8">
          <h2 id="delivery-title" className="font-display text-2xl leading-[1.2] font-bold text-medium-green">
            Levering
          </h2>
          <DeliveryOptionsPicker
            options={shownOptions}
            value={deliveryOptionId}
            onChange={(id) => {
              setDeliveryOptionId(id);
              setErrors((current) => new Set([...current].filter((n) => n !== "deliveryOptionId")));
            }}
            status={shownOptionsStatus}
            error={errors.has("deliveryOptionId") ? FIELD_ERRORS.deliveryOptionId : undefined}
          />
        </section>
      </div>

      <aside
        aria-labelledby="checkout-summary-title"
        className="flex flex-col gap-5 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8 lg:sticky lg:top-[calc(var(--nav-offset,0px)+2rem)] lg:w-[440px] lg:shrink-0"
      >
        <h2 id="checkout-summary-title" className="font-display text-2xl leading-[1.2] font-bold text-medium-green md:text-[32px]">
          Je bestelling
        </h2>

        <ul className="flex flex-col gap-4" aria-label="Producten">
          {lines.map((line) => (
            <li key={line.id} className="flex items-center gap-4">
              <CartLinePhoto photoUrl={line.photoUrl} size={64} className="size-16 rounded-xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="font-label text-base font-bold text-text-primary">
                  {line.productTitle} {line.quantity > 1 && <span className="text-text-muted">× {line.quantity}</span>}
                </p>
                {line.edition && (
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="waiting">{line.edition}</Badge>
                  </div>
                )}
              </div>
              <p className="font-label text-base font-extrabold text-medium-green">{formatPrice(line.total.amount)}</p>
            </li>
          ))}
        </ul>

        <dl className="flex flex-col gap-2 border-t border-off-white-dark pt-4 text-base text-text-primary">
          <div className="flex justify-between gap-4">
            <dt>Subtotaal</dt>
            <dd className="font-label font-semibold">{formatPrice(subtotalCents / 100)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Verzending{selected ? ` (${selected.carrier})` : ""}</dt>
            <dd className={`font-label font-semibold ${selected ? "" : "text-placeholder"}`}>
              {selected ? formatPrice(selected.priceCents / 100) : "Kies een optie"}
            </dd>
          </div>
        </dl>
        <div className="flex items-baseline justify-between border-t border-text-primary pt-4 text-medium-green">
          <p className="font-display text-2xl font-medium">Totaal</p>
          <p className="font-label text-[32px] leading-[normal] font-extrabold">{formatPrice(totalCents / 100)}</p>
        </div>
        <p className="-mt-3 text-sm text-text-primary">Incl. 21% btw. Levering binnen {deliveryTime} na je bestelling.</p>

        {/* LEGAL-REVIEW: pre-contractual info. The withdrawal exception must be clear before ordering. */}
        <div className="flex flex-col gap-2 rounded-2xl bg-light-yellow p-4 text-sm leading-[1.5] text-text-primary">
          {lines.some((line) => !line.withdrawable) && (
            <>
              <p>
                <strong className="font-label">Op maat gemaakt.</strong> Je Palley wordt gemaakt op basis van jouw foto’s, dus het
                herroepingsrecht geldt niet. De wettelijke garantie van 2 jaar blijft natuurlijk gelden.
              </p>
              <p>We maken het 3D-model met hulp van AI; ons team werkt het daarna met de hand bij.</p>
            </>
          )}
          {lines.some((line) => line.withdrawable) && (
            <p>
              <strong className="font-label">Collectibles.</strong> {COLLECTIBLE_RETURN_NOTE}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-start gap-3 text-base leading-[1.5] text-text-primary">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => {
                setAcceptTerms(event.target.checked);
                if (event.target.checked) setErrors((current) => new Set([...current].filter((n) => n !== "acceptTerms")));
              }}
              aria-invalid={errors.has("acceptTerms") || undefined}
              aria-describedby={errors.has("acceptTerms") ? "acceptTerms-error" : undefined}
              className="mt-0.5 size-5 shrink-0 cursor-pointer accent-medium-green"
            />
            <span>
              Ik ga akkoord met de{" "}
              <Link href={TERMS_URL} target="_blank" className="font-semibold text-medium-green underline underline-offset-2">
                algemene voorwaarden
              </Link>{" "}
              en weet dat ik mijn bestelling niet kan herroepen omdat ze op maat gemaakt wordt.
            </span>
          </label>
          {errors.has("acceptTerms") && (
            <p id="acceptTerms-error" className={errorClassName}>
              {FIELD_ERRORS.acceptTerms}
            </p>
          )}
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-[1.5] text-text-primary">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(event) => setMarketingOptIn(event.target.checked)}
              className="mt-0.5 size-5 shrink-0 cursor-pointer accent-medium-green"
            />
            <span>Hou me op de hoogte van nieuwe Palleys (optioneel, uitschrijven kan altijd).</span>
          </label>
        </div>

        {/* LEGAL-REVIEW: the button must state the obligation to pay (WER VI.45 §2). */}
        <button
          type="submit"
          disabled={submitting || closed}
          aria-busy={submitting}
          className="flex items-center justify-center gap-3 rounded-pill bg-orange py-[18px] font-label text-lg leading-[normal] font-semibold text-off-white transition hover:bg-orange-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Naar betalen…" : "Bestellen met betalingsverplichting"}
        </button>
        {submitError && (
          <p role="alert" className={errorClassName}>
            {submitError}
          </p>
        )}
        <p className="text-center text-sm text-text-muted">
          Je betaalt veilig met {PAYMENT_METHODS.map((method) => PAYMENT_METHOD_LABELS[method]).join(" of ")}: scan de
          QR-code of betaal in je bankapp.
          Lees ook ons{" "}
          <Link href={PRIVACY_URL} className="underline underline-offset-2">
            privacybeleid
          </Link>
          .
        </p>
      </aside>
    </form>
  );
}
