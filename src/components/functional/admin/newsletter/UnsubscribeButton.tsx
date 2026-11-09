"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSubscriber } from "@/core/modules/newsletter/api";
import { getApiErrorMessage } from "@/core/networking/api";

/* Takes an address off the mailing list when someone asks (by email, for now). */
export function UnsubscribeButton({ id, email }: { id: string; email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unsubscribe() {
    if (!window.confirm(`${email} uitschrijven? Het adres krijgt dan geen nieuws meer.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteSubscriber(id);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={unsubscribe}
        disabled={busy}
        className="font-label font-semibold text-medium-green underline underline-offset-2 disabled:opacity-60"
      >
        {busy ? "Bezig…" : "Uitschrijven"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-[#a3341a]">
          {error}
        </p>
      )}
    </>
  );
}
