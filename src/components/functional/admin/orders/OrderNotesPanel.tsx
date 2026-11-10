"use client";

import { useState } from "react";
import { putOrderNotes } from "@/core/modules/orders/api";
import type { AdminOrderDetail } from "@/core/modules/orders/types";
import { getApiErrorMessage } from "@/core/networking/api";
import { formatDateTime } from "@/core/utils/format";
import Button from "@/components/design/Button";
import { Textarea } from "@/components/design/form";
import { MAX_ADMIN_NOTES_LENGTH } from "@/data/checkout";

type OrderNotesPanelProps = {
  orderId: string;
  notes: AdminOrderDetail["adminNotes"];
};

/*
 * The team's own notepad on an order: who picks it up, their Instagram name, what was agreed in a DM. Free text, never
 * shown to the customer. It saves with the button or when the field loses focus with changes in it, so a note
 * typed in between two other actions isn't lost.
 */
export function OrderNotesPanel({ orderId, notes }: OrderNotesPanelProps) {
  const [text, setText] = useState(notes.text);
  const [saved, setSaved] = useState(notes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = text.trim() !== saved.text;

  async function save() {
    if (!dirty || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await putOrderNotes(orderId, text);
      setSaved(result);
      setText(result.text);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-6 text-sm">
      <h2 className="font-display text-xl font-medium text-medium-green">
        <label htmlFor={`order-notes-${orderId}`}>Notities</label>
      </h2>
      <p className="mt-1 text-text-muted">Alleen voor het team, bv. de Instagram-naam van wie komt ophalen.</p>
      <Textarea
        id={`order-notes-${orderId}`}
        rows={5}
        maxLength={MAX_ADMIN_NOTES_LENGTH}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => void save()}
        placeholder="@instagram, afspraak, wat er gezegd werd…"
        className="mt-3 min-h-32 resize-y text-base!"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" variant="primary" onClick={() => void save()} loading={busy} disabled={!dirty}>
          Opslaan
        </Button>
        <p className="text-xs text-text-muted" aria-live="polite">
          {dirty
            ? "Niet bewaard"
            : saved.updatedAt
              ? `Bewaard${saved.updatedBy ? ` door ${saved.updatedBy}` : ""} op ${formatDateTime(saved.updatedAt)}`
              : null}
        </p>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-[#a3341a]">
          {error}
        </p>
      )}
    </section>
  );
}
