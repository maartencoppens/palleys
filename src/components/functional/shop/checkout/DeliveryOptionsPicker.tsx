"use client";

import { useLocale, useMessages } from "@/core/locale/client";
import type { DeliveryOptionView } from "@/core/modules/checkout/types";
import { formatPrice } from "@/core/utils/format";

type DeliveryOptionsPickerProps = {
  options: DeliveryOptionView[];
  value: string | null;
  onChange: (id: string) => void;
  status: "loading" | "ready" | "error";
  error?: string;
};

/*
 * Radio list of delivery options, grouped by type. Prices come from our server; what's picked here is re-checked
 * at checkout. A service point picker (Sendcloud) slots in under "Afhaalpunt" once that provider is connected.
 */
export default function DeliveryOptionsPicker({ options, value, onChange, status, error }: DeliveryOptionsPickerProps) {
  const { shipping: m } = useMessages();
  const locale = useLocale();
  const groupLabels = { HOME: m.home, SERVICE_POINT: m.servicePoint, PICKUP: m.pickup, HANDOVER: m.handover };
  if (status === "loading" && options.length === 0) {
    return (
      <p className="text-base text-text-muted" role="status">
        {m.loading}
      </p>
    );
  }
  if (status === "error") {
    return (
      <p role="alert" className="font-label text-base font-semibold text-[#a3341a]">
        {m.error}
      </p>
    );
  }
  if (options.length === 0) {
    return (
      <p role="alert" className="font-label text-base font-semibold text-[#a3341a]">
        {m.none}
      </p>
    );
  }

  const groups = (["HOME", "SERVICE_POINT", "PICKUP", "HANDOVER"] as const)
    .map((type) => ({ type, options: options.filter((option) => option.deliveryType === type) }))
    .filter((group) => group.options.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <fieldset key={group.type} className="flex flex-col gap-3" aria-describedby={error ? "delivery-error" : undefined}>
          <legend className="mb-2 font-label text-base font-bold text-medium-green">{groupLabels[group.type]}</legend>
          {group.options.map((option) => {
            const checked = value === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-4 rounded-2xl border-[1.5px] px-4 py-3.5 transition-colors ${
                  checked ? "border-medium-green bg-light-green/40" : "border-off-white-dark bg-white hover:bg-off-white"
                }`}
              >
                <input
                  type="radio"
                  name="deliveryOption"
                  value={option.id}
                  checked={checked}
                  onChange={() => onChange(option.id)}
                  className="size-5 shrink-0 accent-medium-green"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-label text-base font-bold text-text-primary">{m.options[option.id]?.label ?? option.label}</span>
                  <span className="text-sm text-text-muted">{m.options[option.id]?.eta ?? option.eta}</span>
                </span>
                <span className="font-label text-base font-extrabold text-medium-green">
                  {option.priceCents === 0 ? m.free : formatPrice(option.priceCents / 100, locale)}
                </span>
              </label>
            );
          })}
        </fieldset>
      ))}
      {error && (
        <p id="delivery-error" className="font-label text-base font-semibold text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
