"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postOrderStatus } from "@/core/modules/orders/api";
import { downloadBatchBpost, postPickupUpdate, postReadyForPickup } from "@/core/modules/batches/api";
import type { BpostProblemView } from "@/core/modules/batches/types";
import { getApiErrorMessage } from "@/core/networking/api";
import Button from "@/components/design/Button";
import { Input, Textarea } from "@/components/design/form";

/* What happens to an order after post-production: a parcel, or a pickup on campus. */

function Problem({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="text-sm text-[#a3341a]">
      {error}
    </p>
  ) : null;
}

/** Shipped by bpost (optional tracking code), or picked up / handed over: SHIPPED either way. */
export function FinishOrderForm({ orderId, deliveryType, disabled }: { orderId: string; deliveryType: string | null; disabled: boolean }) {
  const router = useRouter();
  const [trackingCode, setTrackingCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parcel = deliveryType === "HOME";
  const label = parcel ? "Markeer als verzonden" : deliveryType === "PICKUP" ? "Markeer als opgehaald" : "Markeer als overhandigd";

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await postOrderStatus(orderId, { status: "SHIPPED", trackingCode: parcel ? trackingCode.trim() || undefined : undefined });
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        {parcel && (
          <div>
            <label htmlFor={`tracking-${orderId}`} className="font-label text-sm font-semibold text-text-muted">
              Trackingcode (optioneel)
            </label>
            <Input id={`tracking-${orderId}`} value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} className="mt-1 h-11 text-base!" />
          </div>
        )}
        <Button variant="secondary" disabled={disabled} loading={busy} onClick={finish}>
          {label}
        </Button>
      </div>
      {disabled && <p className="text-xs text-text-muted">Vink eerst alle items af.</p>}
      <Problem error={error} />
    </div>
  );
}

/** Lies ready on campus: the customer gets one mail. */
export function ReadyForPickupButton({ orderId, disabled }: { orderId: string; disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function mark() {
    setBusy(true);
    setError(null);
    try {
      const result = await postReadyForPickup(orderId);
      setNotice(result.mailed ? "Klant gemaild" : result.alreadyReady ? "Lag al klaar" : "Klaargelegd, geen mail (geen e-mailadres of mail niet ingesteld)");
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="primary" disabled={disabled} loading={busy} onClick={mark}>
        Klaar om af te halen
      </Button>
      {notice && <p className="text-sm text-medium-green">{notice}</p>}
      <Problem error={error} />
    </div>
  );
}

/** The bpost CSV for a batch's deliveries, with what can't be exported listed first. */
export function BpostDownload({ batchId, labels, problems }: { batchId: string; labels: number; problems: BpostProblemView[] }) {
  return (
    <div className="flex flex-col gap-3">
      {problems.length > 0 && (
        <div role="alert" className="rounded-2xl bg-pink p-4 text-sm text-[#a3341a]">
          <p className="font-label font-bold">Niet in de CSV, eerst aanpassen op de orderpagina:</p>
          <ul className="mt-2 list-disc pl-5">
            {problems.map((problem) => (
              <li key={problem.orderNumber}>
                <strong>{problem.orderNumber}</strong>: {problem.problems.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <Button variant="secondary" disabled={labels === 0} onClick={() => downloadBatchBpost(batchId)}>
          Download bpost-CSV ({labels} {labels === 1 ? "label" : "labels"})
        </Button>
      </div>
    </div>
  );
}

/** A message to everyone whose pickup lies ready, e.g. when we're on campus. As often as needed. */
export function PickupUpdateForm({ recipients, needsEnglish }: { recipients: number; needsEnglish: boolean }) {
  const router = useRouter();
  const [nl, setNl] = useState("");
  const [en, setEn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function send() {
    if (!window.confirm(`Deze update mailen naar ${recipients} ${recipients === 1 ? "klant" : "klanten"}?`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await postPickupUpdate({ nl: nl.trim(), en: en.trim() || undefined });
      setNotice(`Verstuurd naar ${result.sent.length}${result.failed.length > 0 ? `. Mislukt: ${result.failed.join(", ")}` : ""}`);
      setNl("");
      setEn("");
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="pickup-update-nl" className="font-label text-sm font-semibold text-text-muted">
        Bericht (Nederlands)
      </label>
      <Textarea
        id="pickup-update-nl"
        rows={3}
        value={nl}
        onChange={(event) => setNl(event.target.value)}
        placeholder="Dinsdag 18 november tussen 12 en 14 uur aan het onthaal."
        className="min-h-24 text-base!"
      />
      <label htmlFor="pickup-update-en" className="font-label text-sm font-semibold text-text-muted">
        Bericht (Engels){needsEnglish ? "" : ", optioneel: niemand bestelde in het Engels"}
      </label>
      <Textarea
        id="pickup-update-en"
        rows={3}
        value={en}
        onChange={(event) => setEn(event.target.value)}
        placeholder="Tuesday 18 November between 12 and 2 pm at the front desk."
        className="min-h-24 text-base!"
      />
      <div>
        <Button variant="primary" disabled={recipients === 0 || !nl.trim() || (needsEnglish && !en.trim())} loading={busy} onClick={send}>
          Update mailen ({recipients})
        </Button>
      </div>
      {notice && <p className="text-sm text-medium-green">{notice}</p>}
      <Problem error={error} />
    </div>
  );
}
