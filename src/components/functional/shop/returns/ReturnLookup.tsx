"use client";

import { useState } from "react";
import axios from "axios";
import Button from "@/components/design/Button";
import { Input, Label } from "@/components/design/form";
import { useLocale, useMessages } from "@/core/locale/client";
import { fill } from "@/core/locale/fill";
import { postReturnLookup } from "@/core/modules/returns/api";
import { isOrderRef } from "@/core/utils/naming";
import { normalizeOrderNumber } from "@/core/modules/returns/utils";
import { FIELD_LIMITS } from "@/data/checkout";
import { errorClassName, inputClassName, labelClassName, hintClassName } from "./styles";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = "orderNumber" | "email";

/*
 * Order number + e-mail address. The answer is always the same neutral sentence, whether the order exists or not:
 * the link only ever goes to the order's own address.
 */
export default function ReturnLookup({ companyEmail, expired = false }: { companyEmail: string; expired?: boolean }) {
  const { returns: m, common } = useMessages();
  const locale = useLocale();
  const [values, setValues] = useState({ orderNumber: "", email: "" });
  const [errors, setErrors] = useState<Set<Field>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const found = new Set<Field>();
    if (!isOrderRef(normalizeOrderNumber(values.orderNumber))) found.add("orderNumber");
    if (!EMAIL_PATTERN.test(values.email.trim())) found.add("email");
    setErrors(found);
    setSubmitError(null);
    if (found.size > 0) {
      // By id: aria-invalid only lands with the next render.
      document.getElementById(`return-${[...found][0]}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await postReturnLookup({ ...values, locale });
      setSent(true);
    } catch (error) {
      const code = axios.isAxiosError<{ error?: string }>(error) ? error.response?.data?.error : null;
      setSubmitError(code === "rate_limited" ? m.lookup.errors.rateLimited : common.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <section role="status" className="flex flex-col items-start gap-3 rounded-3xl bg-white p-6 md:p-8">
        <h2 className="mt-0!">{m.lookup.title}</h2>
        <p className="font-semibold">{m.lookup.sent}</p>
        <p className="text-base">{fill(m.lookup.sentHint, { email: companyEmail })}</p>
        <Button variant="secondary" onClick={() => setSent(false)}>
          {m.lookup.again}
        </Button>
      </section>
    );
  }

  const field = (name: Field, label: string, hint: string, props: React.ComponentProps<typeof Input>) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`return-${name}`} className={labelClassName}>
        {label}
      </Label>
      <Input
        id={`return-${name}`}
        value={values[name]}
        onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}
        aria-invalid={errors.has(name) || undefined}
        aria-describedby={`return-${name}-hint${errors.has(name) ? ` return-${name}-error` : ""}`}
        className={inputClassName}
        {...props}
      />
      <p id={`return-${name}-hint`} className={hintClassName}>
        {hint}
      </p>
      {errors.has(name) && (
        <p id={`return-${name}-error`} className={errorClassName}>
          {m.lookup.errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <section aria-labelledby="return-lookup-title" className="flex flex-col gap-4 rounded-3xl bg-white p-6 md:p-8">
      {expired && (
        <div role="alert" className="flex flex-col gap-1 rounded-2xl bg-light-yellow p-4">
          <p className="font-label font-bold">{m.session.expiredTitle}</p>
          <p className="text-base">{m.session.expiredText}</p>
        </div>
      )}
      <h2 id="return-lookup-title" className="mt-0!">
        {m.lookup.title}
      </h2>
      <form id="return-lookup" onSubmit={submit} noValidate className="flex flex-col gap-5">
        {field("orderNumber", m.lookup.orderNumber, m.lookup.orderNumberHint, { autoComplete: "off", maxLength: 40, spellCheck: false })}
        {field("email", m.lookup.email, m.lookup.emailHint, { type: "email", autoComplete: "email", maxLength: FIELD_LIMITS.email })}
        {submitError && (
          <p role="alert" className={errorClassName}>
            {submitError}
          </p>
        )}
        <Button type="submit" variant="primary" loading={submitting} loadingText={common.loading} className="self-start">
          {m.lookup.submit}
        </Button>
      </form>
    </section>
  );
}
