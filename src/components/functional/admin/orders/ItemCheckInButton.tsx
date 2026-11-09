"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postItemCheckIn } from "@/core/modules/orders/api";
import { getApiErrorMessage } from "@/core/networking/api";
import type { ItemStage } from "@/core/modules/orders/check-in";

/* The human check on one order item. Ticking off a personalised Palley waits until its model is print-ready. */
export function ItemCheckInButton({ orderId, itemId, stage }: { orderId: string; itemId: string; stage: ItemStage }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checked = stage === "checked";

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await postItemCheckIn(orderId, itemId, !checked);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Every copy cancelled or withdrawn before it left: nothing to check.
  if (stage === "cancelled") return null;

  return (
    <div className="flex flex-col gap-1">
      <label className={`flex items-center gap-2 font-label text-sm font-bold ${stage === "in_pipeline" ? "cursor-not-allowed text-text-muted" : "cursor-pointer text-medium-green"}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={busy || stage === "in_pipeline"}
          onChange={toggle}
          className="size-5 accent-medium-green"
        />
        {stage === "in_pipeline" ? "Nog in de pipeline" : "Gecontroleerd en klaar"}
      </label>
      {error && (
        <p role="alert" className="text-xs text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
