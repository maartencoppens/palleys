"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCollectible, postRestoreCollectible } from "@/core/modules/collectibles/api";
import { getApiErrorMessage } from "@/core/networking/api";

const linkClassName = "rounded font-label font-bold underline underline-offset-4 transition-colors disabled:opacity-50";

/*
 * Removing archives the product: orders keep referring to it, and it can be put back. An archived one can then be
 * deleted for good (as long as no open order needs it).
 */
export function CollectibleActions({ id, name, archived, hasOrders }: { id: string; name: string; archived: boolean; hasOrders: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(call: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await call();
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {archived ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => postRestoreCollectible(id))}
            className={`${linkClassName} text-medium-green hover:text-orange`}
          >
            {busy ? "Bezig…" : "Terugzetten"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const warning = hasOrders
                ? `"${name}" definitief verwijderen? Foto en 3D-modellen gaan weg. Oude orders houden hun naam en productcode, maar verwijzen er niet meer naar. Dit kan niet ongedaan gemaakt worden.`
                : `"${name}" definitief verwijderen, met foto en 3D-modellen? Dit kan niet ongedaan gemaakt worden.`;
              if (window.confirm(warning)) void run(() => deleteCollectible(id, true));
            }}
            className={`${linkClassName} text-[#a3341a]`}
          >
            Definitief verwijderen
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`"${name}" van de website halen en verwijderen?`)) void run(() => deleteCollectible(id));
          }}
          className={`${linkClassName} text-[#a3341a]`}
        >
          {busy ? "Bezig…" : "Verwijderen"}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-[#a3341a]">
          {error}
        </p>
      )}
    </>
  );
}
