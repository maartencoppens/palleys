"use client";

import { useState } from "react";
import Button from "@/components/design/Button";
import { api } from "@/core/networking/api";

const OUTCOMES = [
  { value: "PAID", label: "Betaling gelukt", variant: "primary" },
  { value: "FAILED", label: "Betaling mislukt", variant: "secondary" },
  { value: "CANCELED", label: "Geannuleerd door de klant", variant: "secondary" },
  { value: "EXPIRED", label: "Verlopen", variant: "secondary" },
] as const;

export default function FakePaymentButtons({ paymentId, returnUrl }: { paymentId: string; returnUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function finish(outcome: (typeof OUTCOMES)[number]["value"]) {
    setBusy(true);
    setError(false);
    try {
      await api.post("/dev/test-betaling", { paymentId, outcome });
      window.location.assign(returnUrl);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {OUTCOMES.map((outcome) => (
        <Button key={outcome.value} type="button" variant={outcome.variant} disabled={busy} onClick={() => finish(outcome.value)}>
          {outcome.label}
        </Button>
      ))}
      {error && (
        <p role="alert" className="text-sm text-[#a3341a]">
          Dat lukte niet. Probeer het nog eens.
        </p>
      )}
    </div>
  );
}
