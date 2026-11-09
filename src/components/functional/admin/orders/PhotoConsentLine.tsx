"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePhotoConsent } from "@/core/modules/orders/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { formatDateTime } from "@/core/utils/format";

/* Consent for marketing with the photos (art. 5.4), and withdrawing it when the customer asks. */
export function PhotoConsentLine({ orderId, consentAt }: { orderId: string; consentAt: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    if (!window.confirm("Toestemming intrekken? De foto's worden dan na de gewone bewaartermijn verwijderd.")) return;
    setBusy(true);
    setError(null);
    try {
      await deletePhotoConsent(orderId);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p>
        Foto&apos;s voor marketing: {consentAt ? `ja, sinds ${formatDateTime(consentAt)}` : "nee"}
        {consentAt && (
          <button
            type="button"
            onClick={withdraw}
            disabled={busy}
            className="ml-2 font-label font-semibold text-medium-green underline underline-offset-2 disabled:opacity-60"
          >
            {busy ? "Bezig…" : "Intrekken"}
          </button>
        )}
      </p>
      {error && (
        <p role="alert" className="text-xs text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
