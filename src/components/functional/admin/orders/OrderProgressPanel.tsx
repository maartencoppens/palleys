"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/db/generated/enums";
import { postOrderStatus } from "@/core/modules/orders/api";
import type { CheckInSummary } from "@/core/modules/orders/check-in";
import { getApiErrorMessage } from "@/core/networking/api";
import Button from "@/components/design/Button";
import { Input } from "@/components/design/form";

type OrderProgressPanelProps = {
  orderId: string;
  status: OrderStatus;
  summary: CheckInSummary;
  nextStep: string;
  handover: boolean;
  /** Money we recorded ourselves can be marked as returned here; Bancontact refunds go through its portal. */
  canMarkRefunded: boolean;
};

/* From paid to out of the door: what's next, and the steps only a person can confirm. */
export function OrderProgressPanel({ orderId, status, summary, nextStep, handover, canMarkRefunded }: OrderProgressPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const open = status === "PAID" || status === "IN_PRODUCTION";
  const allChecked = summary.total > 0 && summary.checked === summary.total;

  async function move(next: "IN_PRODUCTION" | "SHIPPED" | "REFUNDED") {
    setBusy(next);
    setError(null);
    try {
      await postOrderStatus(orderId, { status: next, trackingCode: next === "SHIPPED" ? trackingCode.trim() : undefined });
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-6">
      <h2 className="font-display text-xl font-medium text-medium-green">Check-in</h2>
      <p className="mt-2 font-label text-base font-bold">{nextStep}</p>
      {open && (
        <>
          <p className="mt-1 text-sm text-text-muted tabular-nums">
            {summary.checked} van {summary.total} {summary.total === 1 ? "item" : "items"} afgevinkt
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {status === "PAID" && (
              <Button variant="secondary" className="w-full" loading={busy === "IN_PRODUCTION"} onClick={() => move("IN_PRODUCTION")}>
                Start productie
              </Button>
            )}
            {!handover && (
              <div>
                <label htmlFor="tracking-code" className="font-label text-sm font-semibold text-text-muted">
                  Trackingcode (optioneel)
                </label>
                <Input
                  id="tracking-code"
                  value={trackingCode}
                  onChange={(event) => setTrackingCode(event.target.value)}
                  className="mt-1 h-11 text-base!"
                />
              </div>
            )}
            <Button variant="primary" className="w-full" disabled={!allChecked} loading={busy === "SHIPPED"} onClick={() => move("SHIPPED")}>
              {handover ? "Markeer als overhandigd" : "Markeer als verzonden"}
            </Button>
          </div>
        </>
      )}
      {canMarkRefunded && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            if (window.confirm("Deze order markeren als terugbetaald?")) void move("REFUNDED");
          }}
          className="mt-4 rounded font-label text-sm font-bold text-[#a3341a] underline underline-offset-4 disabled:opacity-50"
        >
          Markeer als terugbetaald
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#a3341a]">
          {error}
        </p>
      )}
    </section>
  );
}
