"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { PreviewStatus } from "@/db/client";
import type { AdminStatusChange } from "@/core/modules/previews/types";
import { ADMIN_SETTABLE_STATUSES } from "@/core/modules/previews/status";
import { postStatusOverride } from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { formatDateTime } from "@/core/utils/format";
import { Button } from "@/components/design/Button";
import { previewStatusLabel } from "./PreviewStatusBadge";

type StatusOverridePanelProps = {
  previewId: string;
  currentStatus: PreviewStatus;
  history: AdminStatusChange[];
};

// Noodknop om een vastgelopen preview recht te zetten zonder in de database
// te moeten. Staat standaard dicht, zodat je hem niet per ongeluk gebruikt.
export function StatusOverridePanel({
  previewId,
  currentStatus,
  history,
}: StatusOverridePanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState<PreviewStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const label = previewStatusLabel(status);
    if (!window.confirm(`Status echt op "${label}" zetten?`)) return;

    setLoading(true);
    setError(null);
    try {
      await postStatusOverride(previewId, status, reason);
      setReason("");
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="rounded-lg border border-line bg-surface p-5">
      <summary className="cursor-pointer font-semibold">
        Status handmatig aanpassen
      </summary>
      <p className="mt-2 text-sm text-muted">
        Alleen als er iets is misgelopen. Bestanden en Meshy-taken blijven
        zoals ze zijn.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
        <label className="block">
          <span className="text-muted">Nieuwe status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PreviewStatus)}
            className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2"
          >
            {ADMIN_SETTABLE_STATUSES.map((option) => (
              <option key={option} value={option}>
                {previewStatusLabel(option)}
                {option === currentStatus ? " (huidig)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-muted">Reden</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            required
            minLength={3}
            maxLength={500}
            placeholder="bv. Meshy-webhook kwam nooit binnen"
            className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2"
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          loading={loading}
          disabled={status === currentStatus || reason.trim().length < 3}
        >
          Status aanpassen
        </Button>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
      </form>

      {history.length > 0 && (
        <ul className="mt-5 space-y-3 border-t border-line pt-4 text-xs">
          {history.map((change) => (
            <li key={change.createdAt}>
              <p className="font-medium">
                {previewStatusLabel(change.fromStatus)} →{" "}
                {previewStatusLabel(change.toStatus)}
              </p>
              <p className="text-muted">
                {change.changedBy} · {formatDateTime(change.createdAt)}
              </p>
              <p className="mt-0.5">{change.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
