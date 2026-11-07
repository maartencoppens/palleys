"use client";

import { useState } from "react";
import { downloadCollectibleModel } from "@/core/modules/collectibles/api";
import { getApiErrorMessage } from "@/core/networking/api";

/* Downloads the collectible's stored print zip: a collectible is never generated again, it's printed from this. */
export function CollectibleModelButton({ collectibleId }: { collectibleId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      await downloadCollectibleModel(collectibleId);
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
        onClick={download}
        disabled={busy}
        className="font-label text-sm font-bold text-medium-green underline underline-offset-4 hover:text-orange disabled:opacity-50"
      >
        {busy ? "Bezig…" : "Printbestand downloaden"}
      </button>
      {error && (
        <span role="alert" className="text-sm text-[#a3341a]">
          {error}
        </span>
      )}
    </>
  );
}
