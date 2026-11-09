"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/design/Button";
import { Input } from "@/components/design/form";
import { putDeliveredOn } from "@/core/modules/returns/api";
import { getApiErrorMessage } from "@/core/networking/api";

/*
 * The day a parcel really arrived. The 14 days to withdraw count from it; empty = estimated from the shipping date
 * (core/modules/returns/utils.ts), which is what the customer sees until the team fills this in.
 */
export function DeliveredOnForm({ orderId, deliveredOn, estimate }: { orderId: string; deliveredOn: string | null; estimate: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(deliveredOn ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(day: string | null) {
    setBusy(true);
    setError(null);
    try {
      await putDeliveredOn(orderId, day);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <label htmlFor="delivered-on" className="font-label font-semibold text-text-muted">
        Ontvangen door de klant
      </label>
      {!deliveredOn && estimate && <p className="text-xs text-text-muted">Geschat: {estimate}. Vul de echte datum in als je die kent.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Input id="delivered-on" type="date" value={value} onChange={(event) => setValue(event.target.value)} className="h-10 w-auto text-base!" />
        <Button variant="secondary" loading={busy} loadingText="Bezig…" disabled={!value || value === deliveredOn} onClick={() => save(value)}>
          Opslaan
        </Button>
        {deliveredOn && (
          <Button variant="secondary" disabled={busy} onClick={() => save(null)}>
            Wissen
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="font-semibold text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
