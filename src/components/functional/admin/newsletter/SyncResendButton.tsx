"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncWithResend, type SyncSummary } from "@/core/modules/newsletter/api";
import { getApiErrorMessage } from "@/core/networking/api";

function describe(summary: SyncSummary) {
  const parts = [
    summary.created && `${summary.created} toegevoegd`,
    summary.resubscribed && `${summary.resubscribed} opnieuw ingeschreven`,
    summary.unsubscribed && `${summary.unsubscribed} uitgeschreven in Resend`,
    summary.unsubscribedHere && `${summary.unsubscribedHere} hier uitgeschreven (deden het via de mail)`,
    summary.unchanged && `${summary.unchanged} al in orde`,
    summary.failed && `${summary.failed} mislukt, probeer later opnieuw`,
  ].filter(Boolean);
  return parts.length ? `${parts.join(", ")}.` : "Geen adressen om te synchroniseren.";
}

/* Puts the whole list in Resend: new addresses, and unsubscribes in both directions. Safe to press again. */
export function SyncResendButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      setMessage(describe(await syncWithResend()));
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        className="rounded-pill border-[1.5px] border-medium-green px-6 py-3 font-label text-base font-semibold text-medium-green transition hover:bg-medium-green hover:text-off-white disabled:opacity-60"
      >
        {busy ? "Synchroniseren…" : "Synchroniseer met Resend"}
      </button>
      {message && (
        <p role="status" className="max-w-xs text-right text-xs text-text-muted">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
