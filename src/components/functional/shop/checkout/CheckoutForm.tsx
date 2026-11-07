"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Button from "@/components/design/Button";
import { Input, Label } from "@/components/design/form";
import CartLinePhoto from "@/components/functional/shop/cart/CartLinePhoto";
import { lineChoices, lineName } from "@/components/functional/shop/layout/CartMenu";
import { Link, useLocale, useMessages } from "@/core/locale/client";
import { DEFAULT_LOCALE } from "@/core/locale/config";
import { fill, fillNodes } from "@/core/locale/fill";
import WarningNote from "@/components/design/WarningNote";
import { loadCart, publishCart, useCartSnapshot } from "@/core/hooks/useCartSnapshot";
import { patchCartLineAttachment } from "@/core/modules/cart/api";
import { fetchCheckoutConfig, postCheckout, postDeliveryOptions } from "@/core/modules/checkout/api";
import type { CheckoutConfig, DeliveryOptionView } from "@/core/modules/checkout/types";
import { postApplyDiscount } from "@/core/modules/discounts/api";
import type { AppliedDiscount } from "@/core/modules/discounts/types";
import { formatPrice } from "@/core/utils/format";
import { FIELD_LIMITS, PRIVACY_URL, TERMS_URL } from "@/data/checkout";
import { DISCOUNT_CODE_MAX_LENGTH } from "@/data/discounts";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/data/payment-methods";
import { attachments, type Attachment } from "@/data/options";
import { needsShippingAddress, POSTAL_CODE_PATTERNS, type ShippingCountry } from "@/data/shipping";
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientErrors(fields: Fields, deliveryOptionId: string | null, acceptTerms: boolean, shipsToAddress: boolean) {
  const errors = new Set<FieldName>();
  if (!EMAIL_PATTERN.test(fields.email.trim())) errors.add("email");
  for (const name of ["firstName", "lastName"] as const) {
    if (!fields[name].trim()) errors.add(name);
  }
  if (shipsToAddress) {
    for (const name of ["street", "houseNumber", "city"] as const) {
      if (!fields[name].trim()) errors.add(name);
    }
    if (!POSTAL_CODE_PATTERNS[fields.country].test(fields.postalCode.trim())) errors.add("postalCode");
  }
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
  const messages = useMessages();
  const locale = useLocale();
  const { checkout: m, common } = messages;
  const fieldErrors: Record<FieldName, string> = m.fieldErrors;
  const submitErrors: Record<string, string> = m.submitErrors;
  const price = (cents: number) => formatPrice(cents / 100, locale);

  const discountErrorMessage = (error: unknown) => {
    if (!axios.isAxiosError<{ error?: string; minSubtotalCents?: number }>(error)) return common.genericError;
    const data = error.response?.data;
    if (data?.error === "discount_invalid" || data?.error === "invalid_input") return m.discountInvalid;
    if (data?.error === "discount_min_subtotal" && data.minSubtotalCents) {
      return fill(m.discountMinimum, { amount: price(data.minSubtotalCents) });
    }
    if (data?.error === "rate_limited") return m.submitErrors.rate_limited;
    return common.genericError;
  };

  const { cart, loaded } = useCartSnapshot();
  const [cartFailed, setCartFailed] = useState(false);
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [options, setOptions] = useState<DeliveryOptionView[]>([]);
  const [optionsStatus, setOptionsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [deliveryOptionId, setDeliveryOptionId] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [errors, setErrors] = useState<Set<FieldName>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discount, setDiscount] = useState<AppliedDiscount | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);

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

  const postalCode = fields.postalCode.trim();
  const knownPostalCode = POSTAL_CODE_PATTERNS[fields.country].test(postalCode) ? postalCode : undefined;
  const appliedCode = discount?.code ?? null;
  const codeOfLastOptions = useRef<string | null>(null);

  // Delivery options follow the country, the postal code and the discount code, a moment after typing stops.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setOptionsStatus("loading");
      postDeliveryOptions({ country: fields.country, postalCode: knownPostalCode, discountCode: appliedCode ?? undefined })
        .then((next) => {
          if (cancelled) return;
          setOptions(next);
          setOptionsStatus("ready");
          // A code that unlocks delivery in person was entered for exactly that, so it's chosen right away.
          const unlocked = codeOfLastOptions.current !== appliedCode ? next.find((option) => option.deliveryType === "HANDOVER") : undefined;
          codeOfLastOptions.current = appliedCode;
          setDeliveryOptionId((current) =>
            unlocked ? unlocked.id : next.some((option) => option.id === current) ? current : next.length === 1 ? next[0].id : null,
          );
        })
        .catch(() => !cancelled && setOptionsStatus("error"));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fields.country, knownPostalCode, appliedCode]);

  const selected = options.find((option) => option.id === deliveryOptionId) ?? null;
  const shipsToAddress = needsShippingAddress(selected?.deliveryType);
  const subtotalCents = cart?.subtotalCents ?? 0;
  const discountCents = discount?.discountCents ?? 0;
  const totalCents = subtotalCents - discountCents + (selected?.priceCents ?? 0);

  // The mini cart stays usable on this page: a changed cart can change what the code is worth, or whether it applies.
  useEffect(() => {
    if (!appliedCode || !subtotalCents) return;
    let cancelled = false;
    postApplyDiscount(appliedCode)
      .then((next) => !cancelled && setDiscount(next))
      .catch((error) => {
        if (cancelled) return;
        setDiscount(null);
        setDiscountError(discountErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
    // discountErrorMessage only reads the language's texts, which don't change on this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedCode, subtotalCents]);

  const applyDiscount = async () => {
    const code = discountInput.trim();
    if (!code || applyingDiscount) return;
    setApplyingDiscount(true);
    setDiscountError(null);
    try {
      setDiscount(await postApplyDiscount(code));
      setDiscountInput("");
    } catch (error) {
      setDiscountError(discountErrorMessage(error));
    } finally {
      setApplyingDiscount(false);
    }
  };

  const [savingAttachment, setSavingAttachment] = useState<string | null>(null);
  const changeAttachment = async (lineId: string, attachment: Attachment) => {
    setSavingAttachment(lineId);
    setSubmitError(null);
    try {
      publishCart(await patchCartLineAttachment(lineId, attachment));
    } catch {
      setSubmitError(common.genericError);
    } finally {
      setSavingAttachment(null);
    }
  };

  const set =(name: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setFields((current) => ({ ...current, [name]: value }));
    if (errors.has(name)) setErrors((current) => new Set([...current].filter((n) => n !== name)));
  };

  const closed = config ? !config.enabled || !config.paymentsAvailable : false;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || closed) return;
    setSubmitError(null);
    const found = clientErrors(fields, selected?.id ?? null, acceptTerms, shipsToAddress);
    setErrors(found);
    if (found.size > 0) {
      const first = document.querySelector<HTMLElement>("[aria-invalid='true']");
      first?.focus();
      return;
    }
    setSubmitting(true);
    try {
      // No address for a parcel that doesn't exist, whatever was typed before switching.
      const { street, houseNumber, postalCode: postal, city, ...person } = fields;
      const { checkoutUrl } = await postCheckout({
        ...person,
        ...(shipsToAddress && { street, houseNumber, postalCode: postal, city }),
        phone: fields.phone.trim() || undefined,
        deliveryOptionId: selected!.id,
        discountCode: discount?.code,
        acceptTerms,
        marketingOptIn,
        locale,
      });
      window.location.assign(checkoutUrl);
    } catch (error) {
      setSubmitting(false);
      if (axios.isAxiosError<{ error?: string; fields?: string[] }>(error)) {
        const code = error.response?.data?.error;
        const serverFields = (error.response?.data?.fields ?? []).filter((f): f is FieldName => f in fieldErrors);
        if (serverFields.length > 0) setErrors(new Set(serverFields));
        if (code === "delivery_option_invalid") setDeliveryOptionId(null);
        if (code === "discount_invalid" || code === "discount_min_subtotal") setDiscount(null);
        setSubmitError((code && submitErrors[code]) ?? common.genericError);
      } else {
        setSubmitError(common.genericError);
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
          {fieldErrors[name]}
        </p>
      )}
    </div>
  );

  const lines = useMemo(() => cart?.lines ?? [], [cart]);

  if (!loaded && !cartFailed) {
    return (
      <div className="h-96 animate-pulse rounded-3xl bg-white md:rounded-[32px]" role="status" aria-label={common.loading} />
    );
  }
  if (cartFailed) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 rounded-3xl bg-white p-6 md:rounded-[32px] md:p-8">
        <p className="font-display text-2xl font-bold text-medium-green">{messages.cart.loadError}</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          {common.retry}
        </Button>
      </div>
    );
  }
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-3xl bg-white p-6 md:rounded-[32px] md:p-8">
        <p className="font-display text-2xl font-bold text-medium-green">{m.emptyTitle}</p>
        <p className="text-base text-text-primary">{m.emptyText}</p>
        <Button variant="primary" href="/create">
          {common.createPalley}
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
              {config && !config.enabled ? m.closedPaused : m.closedPayments}
            </p>
            <p className="mt-1 text-base text-text-primary">
              {/* An admin writes this message in Dutch: another language gets the standard text. */}
              {(locale === DEFAULT_LOCALE && config?.closedMessage) || m.closedText}
            </p>
          </div>
        )}

        <section aria-labelledby="contact-title" className="flex flex-col gap-5 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8">
          <h2 id="contact-title" className="font-display text-2xl leading-[1.2] font-bold text-medium-green">
            {m.contact}
          </h2>
          {field("email", m.email, {
            type: "email",
            autoComplete: "email",
            inputMode: "email",
            maxLength: FIELD_LIMITS.email,
          })}
          {field("phone", m.phone, {
            type: "tel",
            autoComplete: "tel",
            maxLength: FIELD_LIMITS.phone,
          })}
          <div className="grid gap-5 sm:grid-cols-2">
            {field("firstName", m.firstName, { autoComplete: "given-name", maxLength: FIELD_LIMITS.name })}
            {field("lastName", m.lastName, { autoComplete: "family-name", maxLength: FIELD_LIMITS.name })}
          </div>
        </section>

        <section aria-labelledby="delivery-title" className="flex flex-col gap-5 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8">
          <h2 id="delivery-title" className="font-display text-2xl leading-[1.2] font-bold text-medium-green">
            {m.delivery}
          </h2>
          <DeliveryOptionsPicker
            options={options}
            value={deliveryOptionId}
            onChange={(id) => {
              setDeliveryOptionId(id);
              setErrors((current) => new Set([...current].filter((n) => n !== "deliveryOptionId")));
            }}
            status={optionsStatus}
            error={errors.has("deliveryOptionId") ? fieldErrors.deliveryOptionId : undefined}
          />
        </section>

        {shipsToAddress && (
          <section aria-labelledby="address-title" className="flex flex-col gap-5 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8">
          <h2 id="address-title" className="font-display text-2xl leading-[1.2] font-bold text-medium-green">
            {m.address}
          </h2>
          <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
            {field("street", m.street, { autoComplete: "address-line1", maxLength: FIELD_LIMITS.street })}
            {field("houseNumber", m.houseNumber, { autoComplete: "address-line2", maxLength: FIELD_LIMITS.houseNumber })}
          </div>
          <div className="grid gap-5 sm:grid-cols-[9rem_1fr]">
            {field("postalCode", m.postalCode, {
              autoComplete: "postal-code",
              maxLength: 7,
              inputMode: "numeric",
              placeholder: "9000",
            })}
            {field("city", m.city, { autoComplete: "address-level2", maxLength: FIELD_LIMITS.city })}
          </div>
          {/* Belgium only for now (Bancontact). More countries: SHIPPING_COUNTRIES plus a select here. */}
          <p className="text-base text-text-primary">
            <span className={`${labelClassName} font-label font-extrabold text-medium-green`}>{m.country}</span>
            <br />
            {m.belgium} <span className="text-sm text-text-muted">{m.belgiumOnly}</span>
          </p>
        </section>
        )}
      </div>

      <aside
        aria-labelledby="checkout-summary-title"
        className="flex flex-col gap-5 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8 lg:sticky lg:top-[calc(var(--nav-offset,0px)+2rem)] lg:w-[440px] lg:shrink-0"
      >
        <h2 id="checkout-summary-title" className="font-display text-2xl leading-[1.2] font-bold text-medium-green md:text-[32px]">
          {m.summary}
        </h2>

        <ul className="flex flex-col gap-4" aria-label={m.products}>
          {lines.map((line) => (
            <li key={line.id} className="flex items-start gap-4">
              <CartLinePhoto photoUrl={line.photoUrl} size={64} className="size-16 rounded-xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="font-label text-base font-bold text-text-primary">
                  {lineName(line, messages, locale)} {line.quantity > 1 && <span className="text-text-muted">× {line.quantity}</span>}
                </p>
                {lineChoices(line, messages, locale, { withAttachment: false }) && (
                  <p className="text-sm text-text-primary">{lineChoices(line, messages, locale, { withAttachment: false })}</p>
                )}
                {line.attachment && (
                  <fieldset disabled={savingAttachment === line.id} className="mt-1 disabled:opacity-60">
                    <legend className="mb-1 text-xs text-text-muted">{m.attachmentLegend}</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {attachments.map((option) => (
                        <label key={option.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name={`attachment-${line.id}`}
                            className="peer sr-only"
                            checked={line.attachment === option.value}
                            onChange={() => changeAttachment(line.id, option.value)}
                          />
                          <span className="block rounded-pill border-[1.5px] border-medium-green px-3 py-1.5 font-label text-sm font-semibold text-medium-green transition-colors peer-checked:bg-medium-green peer-checked:text-off-white peer-focus-visible:ring-3 peer-focus-visible:ring-accent-highlights">
                            {messages.options.attachments[option.value]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
              <p className="self-start font-label text-base font-extrabold text-medium-green">{formatPrice(line.total.amount, locale)}</p>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 border-t border-off-white-dark pt-4">
          <Label htmlFor="discountCode" className="text-base">
            {m.discount}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="discountCode"
              value={discountInput}
              onChange={(event) => {
                setDiscountInput(event.target.value);
                setDiscountError(null);
              }}
              onKeyDown={(event) => {
                // Enter here means this code, not placing the order.
                if (event.key !== "Enter") return;
                event.preventDefault();
                void applyDiscount();
              }}
              maxLength={DISCOUNT_CODE_MAX_LENGTH}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={discountError ? true : undefined}
              aria-describedby={discountError ? "discountCode-error" : undefined}
              className="h-12 min-w-0 flex-1 text-base uppercase placeholder:normal-case"
              placeholder={discount ? m.discountOther : m.discountAsk}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={applyDiscount}
              loading={applyingDiscount}
              loadingText="…"
              disabled={!discountInput.trim()}
            >
              {m.discountApply}
            </Button>
          </div>
          {discountError && (
            <p id="discountCode-error" role="alert" className={errorClassName}>
              {discountError}
            </p>
          )}
        </div>

        <dl className="flex flex-col gap-2 border-t border-off-white-dark pt-4 text-base text-text-primary">
          <div className="flex justify-between gap-4">
            <dt>{m.subtotal}</dt>
            <dd className="font-label font-semibold">{price(subtotalCents)}</dd>
          </div>
          {discount && (
            <div className="flex justify-between gap-4 text-medium-green">
              <dt className="flex flex-wrap items-baseline gap-x-2">
                <span>{discount.discountCents > 0 ? fill(m.discountLine, { code: discount.code, label: discount.label }) : fill(m.discountApplied, { code: discount.code })}</span>
                <button
                  type="button"
                  onClick={() => setDiscount(null)}
                  className="text-sm text-text-muted underline underline-offset-2"
                >
                  {m.discountRemove}
                </button>
              </dt>
              {discount.discountCents > 0 && <dd className="font-label font-semibold whitespace-nowrap">- {price(discount.discountCents)}</dd>}
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt>{m.shipping}{shipsToAddress && selected ? ` (${selected.carrier})` : ""}</dt>
            <dd className={`font-label font-semibold ${selected ? "" : "text-placeholder"}`}>
              {selected ? (selected.priceCents === 0 ? messages.shipping.free : price(selected.priceCents)) : m.shippingChoose}
            </dd>
          </div>
        </dl>
        <div className="flex items-baseline justify-between border-t border-text-primary pt-4 text-medium-green">
          <p className="font-display text-2xl font-medium">{m.total}</p>
          <p className="font-label text-[32px] leading-[normal] font-extrabold">{price(totalCents)}</p>
        </div>
        <p className="-mt-3 text-sm text-text-primary">{fill(m.noVat, { deliveryTime })}</p>

        {/* LEGAL-REVIEW: pre-contractual info. The withdrawal exception must be clear before ordering. */}
        <div className="flex flex-col gap-2 rounded-2xl bg-light-yellow p-4 text-sm leading-[1.5] text-text-primary">
          {lines.some((line) => !line.withdrawable) && (
            <>
              <p>
                <strong className="font-label">{m.customTitle}</strong> {m.customText}
              </p>
              <p>{m.customAi}</p>
            </>
          )}
          {lines.some((line) => line.withdrawable) && (
            <p>
              <strong className="font-label">{m.collectibleTitle}</strong> {m.collectibleText}
            </p>
          )}
        </div>

        <WarningNote>{common.heatWarning}</WarningNote>

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
              {fillNodes(lines.some((line) => !line.withdrawable) ? m.acceptCustom : m.accept, {
                terms: (
                  <Link href={TERMS_URL} target="_blank" className="font-semibold text-medium-green underline underline-offset-2">
                    {m.terms}
                  </Link>
                ),
              })}
            </span>
          </label>
          {errors.has("acceptTerms") && (
            <p id="acceptTerms-error" className={errorClassName}>
              {fieldErrors.acceptTerms}
            </p>
          )}
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-[1.5] text-text-primary">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(event) => setMarketingOptIn(event.target.checked)}
              className="mt-0.5 size-5 shrink-0 cursor-pointer accent-medium-green"
            />
            <span>{m.marketing}</span>
          </label>
        </div>

        {/* LEGAL-REVIEW: the button must state the obligation to pay (WER VI.45 §2). */}
        <button
          type="submit"
          disabled={submitting || closed}
          aria-busy={submitting}
          className="flex items-center justify-center gap-3 rounded-pill bg-orange py-[18px] font-label text-lg leading-[normal] font-semibold text-off-white transition hover:bg-orange-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? m.submitting : m.submit}
        </button>
        {submitError && (
          <p role="alert" className={errorClassName}>
            {submitError}
          </p>
        )}
        <p className="text-center text-sm text-text-muted">
          {fillNodes(m.payNote, {
            methods: PAYMENT_METHODS.map((method) => PAYMENT_METHOD_LABELS[method]).join(m.methodsJoin),
            privacy: (
              <Link href={PRIVACY_URL} className="underline underline-offset-2">
                {m.privacy}
              </Link>
            ),
          })}
        </p>
      </aside>
    </form>
  );
}
