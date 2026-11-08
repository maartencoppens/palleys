"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BatchOrderView } from "@/core/modules/batches/types";
import { postAddToBatch, postCreateBatch } from "@/core/modules/batches/api";
import { getApiErrorMessage } from "@/core/networking/api";
import Button from "@/components/design/Button";
import { BatchOrderCard } from "./BatchOrderList";

const selectClassName =
  "h-11 rounded-[15px] bg-off-white-dark px-4 font-label text-base font-semibold text-medium-green outline-none focus-visible:ring-3 focus-visible:ring-accent-highlights";

/* Orders that are print-ready and in no batch: pick some, then make a batch of them or add them to an open one. */
export function ReadyOrdersPicker({ orders, openBatches }: { orders: BatchOrderView[]; openBatches: { id: string; ref: string }[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState("new");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (target === "new") await postCreateBatch(selected);
      else await postAddToBatch(target, selected);
      setSelected([]);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSelected(selected.length === orders.length ? [] : orders.map((order) => order.id))}
          className="font-label text-sm font-bold text-medium-green underline underline-offset-4"
        >
          {selected.length === orders.length ? "Niets selecteren" : "Alles selecteren"}
        </button>
        <select aria-label="Waar naartoe" value={target} onChange={(event) => setTarget(event.target.value)} className={selectClassName}>
          <option value="new">Nieuwe batch</option>
          {openBatches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              Toevoegen aan {batch.ref}
            </option>
          ))}
        </select>
        <Button variant="primary" disabled={selected.length === 0} loading={busy} onClick={submit}>
          {target === "new" ? `Maak een batch (${selected.length})` : `Toevoegen (${selected.length})`}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-[#a3341a]">
          {error}
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {orders.map((order) => (
          <label key={order.id} className={`flex cursor-pointer gap-3 rounded-2xl bg-white ${selected.includes(order.id) ? "ring-3 ring-accent-highlights" : ""}`}>
            <input
              type="checkbox"
              checked={selected.includes(order.id)}
              onChange={() => toggle(order.id)}
              aria-label={`Selecteer ${order.number}`}
              className="mt-5 ml-4 size-5 shrink-0 accent-medium-green"
            />
            <div className="min-w-0 flex-1">
              <BatchOrderCard order={order} />
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
