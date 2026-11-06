"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postDiscount, putDiscount } from "@/core/modules/discounts/api";
import type { AdminDiscount } from "@/core/modules/discounts/types";
import { generateDiscountCode } from "@/core/modules/discounts/utils";
import { getApiErrorMessage } from "@/core/networking/api";
import { fromEuroInput, toEuroInput } from "@/core/utils/format";
import Button from "@/components/design/Button";
import { Input } from "@/components/design/form";
import { DISCOUNT_CODE_MAX_LENGTH, DISCOUNT_NOTE_MAX_LENGTH } from "@/data/discounts";
import { compactFieldClassName, fieldLabelClassName, SaveBar, SettingsCard } from "./SettingsParts";

// A datetime-local field works in the browser's own time zone, without seconds.
function toDateTimeInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const fromDateTimeInput = (value: string) => (value ? new Date(value).toISOString() : null);

export function DiscountForm({ discount }: { discount?: AdminDiscount }) {
  const router = useRouter();
  const [code, setCode] = useState(discount?.code ?? "");
  const [type, setType] = useState<AdminDiscount["type"]>(discount?.type ?? "PERCENTAGE");
  const [value, setValue] = useState(
    discount?.value ? (discount.type === "PERCENTAGE" ? String(discount.value) : toEuroInput(discount.value)) : "",
  );
  const [minSubtotal, setMinSubtotal] = useState(discount?.minSubtotalCents ? toEuroInput(discount.minSubtotalCents) : "");
  const [maxRedemptions, setMaxRedemptions] = useState(discount?.maxRedemptions?.toString() ?? "");
  const [oncePerEmail, setOncePerEmail] = useState(discount?.oncePerEmail ?? false);
  const [personalDelivery, setPersonalDelivery] = useState(discount?.personalDelivery ?? false);
  const [startsAt, setStartsAt] = useState(toDateTimeInput(discount?.startsAt ?? null));
  const [expiresAt, setExpiresAt] = useState(toDateTimeInput(discount?.expiresAt ?? null));
  const [active, setActive] = useState(discount?.active ?? true);
  const [note, setNote] = useState(discount?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const noDiscount = personalDelivery && !value.trim();
    const amount = noDiscount ? 0 : type === "PERCENTAGE" ? Number(value) : fromEuroInput(value);
    if (!noDiscount && (!amount || !Number.isInteger(amount) || amount < 1)) {
      return setError(type === "PERCENTAGE" ? "Vul een percentage in, bv. 10" : "Vul een bedrag in, bv. 5,00");
    }
    const minSubtotalCents = minSubtotal.trim() ? fromEuroInput(minSubtotal) : 0;
    if (minSubtotalCents === null) return setError("Vul een geldig minimumbedrag in, bv. 25,00");
    const limit = maxRedemptions.trim() ? Number(maxRedemptions) : null;
    if (limit !== null && (!Number.isInteger(limit) || limit < 1)) return setError("Vul een geldig aantal keer in, of laat het leeg");

    const input = {
      code,
      type,
      value: amount as number,
      personalDelivery,
      minSubtotalCents,
      maxRedemptions: limit,
      oncePerEmail,
      startsAt: fromDateTimeInput(startsAt),
      expiresAt: fromDateTimeInput(expiresAt),
      active,
      note: note.trim() || null,
    };
    setSaving(true);
    try {
      if (discount) await putDiscount(discount.id, input);
      else await postDiscount(input);
      router.push("/admin/settings/discounts");
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <SettingsCard title="Code en korting">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="discount-code" className={fieldLabelClassName}>
              Code
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Input
                id="discount-code"
                value={code}
                maxLength={DISCOUNT_CODE_MAX_LENGTH}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="WELKOM10"
                autoComplete="off"
                spellCheck={false}
                className={`min-w-0 flex-1 font-mono uppercase ${compactFieldClassName}`}
              />
              <Button type="button" variant="secondary" onClick={() => setCode(generateDiscountCode())}>
                Genereren
              </Button>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Letters, cijfers en streepjes. Een makkelijke code zoals WELKOM10 is ook makkelijk te raden: beperk hem dan in aantal of tijd.
            </p>
          </div>
          <div>
            <label htmlFor="discount-type" className={fieldLabelClassName}>
              Soort korting
            </label>
            <select
              id="discount-type"
              value={type}
              onChange={(event) => {
                setType(event.target.value as AdminDiscount["type"]);
                setValue("");
              }}
              className={`mt-2 w-full rounded-2xl border-[1.5px] border-off-white-dark bg-white px-4 ${compactFieldClassName}`}
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Vast bedrag</option>
            </select>
          </div>
          <div>
            <label htmlFor="discount-value" className={fieldLabelClassName}>
              {type === "PERCENTAGE" ? "Korting (%)" : "Korting (€)"}
            </label>
            <Input
              id="discount-value"
              inputMode={type === "PERCENTAGE" ? "numeric" : "decimal"}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={type === "PERCENTAGE" ? "10" : "5,00"}
              className={`mt-2 ${compactFieldClassName}`}
            />
          </div>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-base font-semibold">
          <input
            type="checkbox"
            checked={personalDelivery}
            onChange={(event) => setPersonalDelivery(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-medium-green"
          />
          <span>
            Vrienden en familie: gratis persoonlijk overhandigen
            <span className="block text-xs font-normal text-text-muted">
              Met deze code verschijnt in de checkout een gratis leveroptie zonder adres en zonder verzending. De order blijft op
              “overhandigen” staan. Laat de korting leeg als ze de volle prijs betalen.
            </span>
          </span>
        </label>
      </SettingsCard>

      <SettingsCard title="Voorwaarden" intro="Alles optioneel. Leeg betekent geen beperking.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="discount-min" className={fieldLabelClassName}>
              Minimaal productbedrag (€)
            </label>
            <Input
              id="discount-min"
              inputMode="decimal"
              value={minSubtotal}
              onChange={(event) => setMinSubtotal(event.target.value)}
              placeholder="25,00"
              className={`mt-2 ${compactFieldClassName}`}
            />
          </div>
          <div>
            <label htmlFor="discount-max" className={fieldLabelClassName}>
              Hoeveel keer in totaal
            </label>
            <Input
              id="discount-max"
              inputMode="numeric"
              value={maxRedemptions}
              onChange={(event) => setMaxRedemptions(event.target.value)}
              placeholder="100"
              className={`mt-2 ${compactFieldClassName}`}
            />
          </div>
          <div>
            <label htmlFor="discount-start" className={fieldLabelClassName}>
              Geldig vanaf
            </label>
            <Input
              id="discount-start"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className={`mt-2 ${compactFieldClassName}`}
            />
          </div>
          <div>
            <label htmlFor="discount-end" className={fieldLabelClassName}>
              Geldig tot
            </label>
            <Input
              id="discount-end"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className={`mt-2 ${compactFieldClassName}`}
            />
          </div>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-base font-semibold">
          <input
            type="checkbox"
            checked={oncePerEmail}
            onChange={(event) => setOncePerEmail(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-medium-green"
          />
          <span>
            Eén keer per e-mailadres
            <span className="block text-xs font-normal text-text-muted">Met een ander adres kan iemand hem opnieuw gebruiken.</span>
          </span>
        </label>
      </SettingsCard>

      <SettingsCard title="Beheer">
        <label className="flex cursor-pointer items-center gap-3 text-base font-semibold">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="size-5 accent-medium-green"
          />
          Actief: klanten kunnen deze code gebruiken
        </label>
        <label htmlFor="discount-note" className={`mt-5 block ${fieldLabelClassName}`}>
          Notitie (alleen voor jullie)
        </label>
        <Input
          id="discount-note"
          value={note}
          maxLength={DISCOUNT_NOTE_MAX_LENGTH}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nieuwsbrief november"
          className={`mt-2 ${compactFieldClassName}`}
        />
      </SettingsCard>

      <SaveBar saving={saving} message={null} error={error} label={discount ? "Opslaan" : "Code aanmaken"} />
    </form>
  );
}
