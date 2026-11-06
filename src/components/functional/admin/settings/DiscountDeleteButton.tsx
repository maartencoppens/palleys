"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDiscountCode } from "@/core/modules/discounts/api";
import { getApiErrorMessage } from "@/core/networking/api";

/* A code that was used can't go: the server refuses it and says to turn it off. */
export function DiscountDeleteButton({ id, code }: { id: string; code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm(`Code "${code}" verwijderen?`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteDiscountCode(id);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={remove}
        className="rounded font-label font-bold text-[#a3341a] underline underline-offset-4 transition-colors disabled:opacity-50"
      >
        {busy ? "Bezig…" : "Verwijderen"}
      </button>
      {error && (
        <p role="alert" className="mt-1 max-w-48 whitespace-normal text-xs text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
