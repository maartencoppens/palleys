"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOrderForGood } from "@/core/modules/orders/api";
import { getApiErrorMessage } from "@/core/networking/api";
import Button from "@/components/design/Button";
import { Input, Textarea } from "@/components/design/form";

type DeleteOrderPanelProps = {
  orderId: string;
  number: string;
  invoiceNumber: string | null;
  /** Paid with real money (not Stripe's test mode): one more confirmation. */
  paidWithRealMoney: boolean;
  /** A Stripe payment that can still be paid: the server refuses until it's settled. */
  paymentStillOpen: boolean;
};

/*
 * Deleting an order for good, for test orders. Closed by default, and the button only works once the order number is
 * typed over and a reason given; the server checks the same and keeps a record of the deletion.
 */
export function DeleteOrderPanel({ orderId, number, invoiceNumber, paidWithRealMoney, paymentStillOpen }: DeleteOrderPanelProps) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const [confirmPaid, setConfirmPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = typed.trim() === number && reason.trim().length >= 5 && (!paidWithRealMoney || confirmPaid) && !paymentStillOpen;

  async function remove() {
    if (!window.confirm(`${number} definitief verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteOrderForGood(orderId, { confirmNumber: typed.trim(), reason: reason.trim(), confirmPaid });
      router.push("/admin/orders");
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <details className="rounded-3xl border-2 border-pink bg-white p-6 text-sm">
      <summary className="cursor-pointer font-label text-base font-bold text-[#a3341a]">Order verwijderen</summary>
      <div className="mt-4 flex flex-col gap-3">
        <p>
          Voor testorders. De order, zijn betalingen, levering en de foto&apos;s en modellen van zijn Palleys verdwijnen. Er blijft alleen
          een notitie over (nummer, bedrag, reden, wie), zonder klantgegevens. Het nummer {number}
          {invoiceNumber ? ` en factuur ${invoiceNumber}` : ""} worden niet opnieuw gebruikt.
        </p>
        {paymentStillOpen && (
          <p role="alert" className="rounded-2xl bg-pink p-3 text-[#a3341a]">
            Er loopt nog een betaling via Stripe. Haal eerst de betaalstatus op, of wacht tot ze verlopen is (30 minuten).
          </p>
        )}
        {invoiceNumber && (
          <p className="rounded-2xl bg-light-yellow p-3 text-banner-text">
            Deze order heeft factuur {invoiceNumber}. Verwijder alleen een testorder: een echte factuur moet je bewaren.
          </p>
        )}
        <label htmlFor="delete-reason" className="font-label font-semibold text-text-muted">
          Waarom?
        </label>
        <Textarea id="delete-reason" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Testorder" className="min-h-16 text-base!" />
        {paidWithRealMoney && (
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={confirmPaid} onChange={(event) => setConfirmPaid(event.target.checked)} className="mt-0.5 size-5 accent-[#a3341a]" />
            Deze order is met echt geld betaald. Ik heb het terugbetaald, of het was een test van ons.
          </label>
        )}
        <label htmlFor="delete-confirm" className="font-label font-semibold text-text-muted">
          Typ <span className="font-mono">{number}</span> om te bevestigen
        </label>
        <Input id="delete-confirm" value={typed} autoComplete="off" onChange={(event) => setTyped(event.target.value)} className="h-11 font-mono text-base!" />
        <div>
          <Button variant="primary" disabled={!ready} loading={busy} onClick={remove} className="bg-[#a3341a]! hover:bg-[#82290f]!">
            Definitief verwijderen
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-[#a3341a]">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
