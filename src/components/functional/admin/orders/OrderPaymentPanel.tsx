"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postManualPayment, postOrderStatus, postPaymentLink } from "@/core/modules/orders/api";
import { getApiErrorMessage } from "@/core/networking/api";
import Button from "@/components/design/Button";
import { MANUAL_PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type ManualPaymentMethod } from "@/data/payment-methods";

type OrderPaymentPanelProps = {
  orderId: string;
  /** The newest Bancontact link that hasn't been paid or lapsed yet. */
  checkoutUrl: string | null;
  paymentsAvailable: boolean;
  canSendConfirmation: boolean;
  free: boolean;
};

/* An unpaid order an admin added: let the customer pay with the Bancontact app, record money received, or cancel. */
export function OrderPaymentPanel({ orderId, checkoutUrl, paymentsAvailable, canSendConfirmation, free }: OrderPaymentPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"link" | "paid" | "cancel" | null>(null);
  const [method, setMethod] = useState<ManualPaymentMethod>(free ? "gift" : "cash");
  const [sendConfirmation, setSendConfirmation] = useState(canSendConfirmation);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "link" | "paid" | "cancel", call: () => Promise<unknown>) {
    setBusy(action);
    setError(null);
    try {
      await call();
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    if (!checkoutUrl) return;
    await navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
  }

  return (
    <section className="rounded-3xl bg-white p-6">
      <h2 className="font-display text-xl font-medium text-medium-green">Betaling</h2>

      <div className="mt-3 flex flex-col gap-3">
        {checkoutUrl ? (
          <>
            <p className="text-sm text-text-muted">
              Open de betaalpagina op je laptop: de klant scant de QR-code met de Bancontact-app. Of stuur de link door; hij is 20 minuten
              geldig.
            </p>
            <Button variant="primary" className="w-full" href={checkoutUrl} target="_blank" rel="noopener noreferrer">
              Open betaalpagina
            </Button>
            <Button type="button" variant="secondary" className="w-full" onClick={copyLink}>
              {copied ? "Gekopieerd" : "Kopieer betaallink"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-text-muted">
            {free
              ? "Deze order kost niets, dus er is geen betaallink nodig."
              : paymentsAvailable
                ? "Maak een betaallink: de klant betaalt met de Bancontact-app."
                : "Betaallinks kunnen zodra Bancontact Pro goedgekeurd en gekoppeld is. Markeer de order tot dan zelf als betaald."}
          </p>
        )}
        {paymentsAvailable && !free && (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            loading={busy === "link"}
            loadingText="Aanmaken…"
            onClick={() => run("link", () => postPaymentLink(orderId))}
          >
            {checkoutUrl ? "Nieuwe betaallink" : "Maak betaallink"}
          </Button>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-off-white-dark pt-4">
        <label htmlFor="manual-method" className="font-label text-sm font-semibold text-text-muted">
          Al betaald? Hoe?
        </label>
        <select
          id="manual-method"
          value={method}
          onChange={(event) => setMethod(event.target.value as ManualPaymentMethod)}
          className="h-11 w-full rounded-[15px] bg-off-white-dark px-4 font-label text-base font-semibold text-medium-green outline-none focus-visible:ring-3 focus-visible:ring-accent-highlights"
        >
          {MANUAL_PAYMENT_METHODS.map((value) => (
            <option key={value} value={value}>
              {PAYMENT_METHOD_LABELS[value]}
            </option>
          ))}
        </select>
        {canSendConfirmation && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendConfirmation}
              onChange={(event) => setSendConfirmation(event.target.checked)}
              className="size-4 accent-medium-green"
            />
            Bevestigingsmail sturen
          </label>
        )}
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          loading={busy === "paid"}
          loadingText="Opslaan…"
          onClick={() => run("paid", () => postManualPayment(orderId, method, sendConfirmation))}
        >
          Markeer als betaald
        </Button>
      </div>

      <button
        type="button"
        disabled={busy !== null}
        onClick={() => {
          if (window.confirm("Deze order annuleren?")) void run("cancel", () => postOrderStatus(orderId, { status: "CANCELLED" }));
        }}
        className="mt-4 rounded font-label text-sm font-bold text-[#a3341a] underline underline-offset-4 disabled:opacity-50"
      >
        Order annuleren
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[#a3341a]">
          {error}
        </p>
      )}
    </section>
  );
}
