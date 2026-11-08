"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteBatch, deleteBatchOrder, downloadBatchZip, postBatchAction, type BatchAction } from "@/core/modules/batches/api";
import { getApiErrorMessage } from "@/core/networking/api";
import Button from "@/components/design/Button";

/* The buttons on a batch. Every one refreshes the page afterwards, so the lists show where things are now. */

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  async function run(action: () => Promise<string | void>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setNotice((await action()) ?? null);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, notice, run };
}

function Feedback({ error, notice }: { error: string | null; notice: string | null }) {
  return (
    <>
      {notice && <p className="text-sm text-medium-green">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm text-[#a3341a]">
          {error}
        </p>
      )}
    </>
  );
}

const ACTION_COPY: Record<BatchAction, { label: string; confirm: string }> = {
  send_to_jlc: {
    label: "Markeer als verzonden naar JLC",
    confirm: "De batch is naar JLC? Daarna kan er niets meer aan veranderen en gaan de orders in productie.",
  },
  received: { label: "Toegekomen van JLC", confirm: "Is deze batch terug van JLC?" },
  ship_all_deliveries: {
    label: "Alles als verzonden markeren",
    confirm: "Alle leveringen die volledig afgevinkt zijn, markeren als verzonden?",
  },
};

export function BatchActionButton({ batchId, action, variant = "primary" }: { batchId: string; action: BatchAction; variant?: "primary" | "secondary" }) {
  const { busy, error, notice, run } = useAction();
  const copy = ACTION_COPY[action];
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant={variant}
        loading={busy}
        onClick={() =>
          run(async () => {
            const result = await postBatchAction(batchId, action);
            if (action !== "ship_all_deliveries") return;
            const shipped = result.shipped?.length ?? 0;
            const blocked = result.blocked ?? [];
            return `${shipped} verzonden${blocked.length > 0 ? `. Nog niet volledig afgevinkt: ${blocked.join(", ")}` : ""}`;
          }, copy.confirm)
        }
      >
        {copy.label}
      </Button>
      <Feedback error={error} notice={notice} />
    </div>
  );
}

export function BatchZipButton({ batchId, fileName }: { batchId: string; fileName: string }) {
  const { busy, error, notice, run } = useAction();
  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" loading={busy} loadingText="Controleren…" onClick={() => run(() => downloadBatchZip(batchId))}>
        Download {fileName}
      </Button>
      <Feedback error={error} notice={notice} />
    </div>
  );
}

export function DeleteBatchButton({ batchId }: { batchId: string }) {
  const { busy, error, notice, run } = useAction();
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => deleteBatch(batchId).then(() => undefined), "Deze lege batch verwijderen?")}
        className="font-label text-sm font-bold text-[#a3341a] underline underline-offset-4 disabled:opacity-50"
      >
        Lege batch verwijderen
      </button>
      <Feedback error={error} notice={notice} />
    </div>
  );
}

export function RemoveFromBatchButton({ batchId, orderId }: { batchId: string; orderId: string }) {
  const { busy, error, notice, run } = useAction();
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => deleteBatchOrder(batchId, orderId).then(() => undefined))}
        className="self-start font-label text-sm font-bold text-[#a3341a] underline underline-offset-4 disabled:opacity-50"
      >
        Uit batch halen
      </button>
      <Feedback error={error} notice={notice} />
    </div>
  );
}
