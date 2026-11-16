"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { BatchStatus, OrderStatus } from "@/db/generated/enums";
import type { PreviewStatus } from "@/db/client";
import type { AdminStatusChange } from "@/core/modules/previews/types";
import { postStatusOverride } from "@/core/modules/previews/api";
import { postOrderStep } from "@/core/modules/orders/api";
import {
  currentOrderStep,
  ORDER_STEP_LABELS,
  ORDER_STEP_PAGES,
  ORDER_STEPS,
  reachableOrderSteps,
  type OrderStep,
} from "@/core/modules/batches/steps";
import { getApiErrorMessage } from "@/core/networking/api";
import { formatDateTime } from "@/core/utils/format";
import { Button } from "@/components/design/Button";
import { previewStatusLabel } from "./PreviewStatusBadge";

type PreviewTarget = {
  id: string;
  status: PreviewStatus;
  /** Approved and downloaded: In Blender on Processed. */
  inBlender: boolean;
  hasModel: boolean;
  hasProcessedFile: boolean;
  history: AdminStatusChange[];
};

type OrderTarget = {
  id: string;
  number: string;
  status: OrderStatus;
  batchStatus: BatchStatus | null;
  openBatches: { id: string; ref: string }[];
};

type StatusOverridePanelProps = {
  /** On the preview page: the steps of this one Palley. */
  preview?: PreviewTarget;
  /** The later steps of the whole order (batch, production, finished): on the order page, and on a paid preview's page. */
  order?: OrderTarget;
};

/*
 * A step is one place in the backoffice. A preview step sets that Palley's status (Goedgekeurd and In Blender are both
 * "approved", told apart by the download); an order step sends the whole order on (batches/service forwardOrderToStep).
 */
type Step = { kind: "preview"; status: PreviewStatus; inBlender?: boolean } | { kind: "order"; step: OrderStep };

const stepValue = (step: Step) =>
  step.kind === "order" ? `order:${step.step}` : `preview:${step.status}${step.inBlender ? ":blender" : ""}`;

function parseStep(value: string): Step {
  const [kind, name, extra] = value.split(":");
  return kind === "order" ? { kind, step: name as OrderStep } : { kind: "preview", status: name as PreviewStatus, inBlender: extra === "blender" };
}

const PREVIEW_GROUPS: { page: string; steps: { status: PreviewStatus; inBlender?: boolean; label?: string }[] }[] = [
  {
    page: "Te reviewen",
    steps: [
      { status: "PAID", label: "Betaald, nog geen pose" },
      { status: "GENERATING_POSE" },
      { status: "POSE_READY" },
      { status: "GENERATING_MODEL" },
      { status: "MODEL_READY" },
      { status: "FAILED" },
    ],
  },
  { page: "Goedgekeurd", steps: [{ status: "APPROVED", label: "Goedgekeurd, nog te downloaden" }] },
  {
    page: "Processed",
    steps: [
      { status: "APPROVED", inBlender: true, label: "In Blender (gedownload)" },
      { status: "PRINT_READY", label: "Klaar voor print" },
    ],
  },
];
const OTHER_PREVIEW_STEPS: { status: PreviewStatus; label: string }[] = [
  { status: "UPLOADED", label: "Geüpload, niet betaald" },
  { status: "EXPIRED", label: "Verlopen" },
];

// Noodknop om een vastgelopen preview of order recht te zetten of door te sturen zonder in de database te moeten.
// Staat standaard dicht, zodat je hem niet per ongeluk gebruikt.
export function StatusOverridePanel({ preview, order }: StatusOverridePanelProps) {
  const router = useRouter();
  const currentPreview = preview && stepValue({ kind: "preview", status: preview.status, inBlender: preview.inBlender });
  const currentOrder = order && currentOrderStep(order.status, order.batchStatus);
  const reachable = order ? reachableOrderSteps(order.status, order.batchStatus) : [];
  const current = currentPreview ?? (currentOrder ? `order:${currentOrder}` : "");

  const [value, setValue] = useState(current);
  const [batchId, setBatchId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = value ? parseStep(value) : null;

  function labelOf(target: Step) {
    if (target.kind === "order") return `${ORDER_STEP_PAGES[target.step]}: ${ORDER_STEP_LABELS[target.step]}`;
    if (target.inBlender) return "Processed: In Blender";
    return previewStatusLabel(target.status);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!step) return;
    const question =
      step.kind === "order"
        ? `De hele order ${order!.number} doorzetten naar "${labelOf(step)}"?`
        : `Status echt op "${labelOf(step)}" zetten?`;
    if (!window.confirm(question)) return;

    setLoading(true);
    setError(null);
    try {
      if (step.kind === "order") await postOrderStep(order!.id, { step: step.step, batchId: batchId || null, reason });
      else await postStatusOverride(preview!.id, step.status, reason, { inBlender: step.inBlender });
      setReason("");
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const option = (target: Step, label: string, disabled = false) => {
    const optionValue = stepValue(target);
    return (
      <option key={optionValue} value={optionValue} disabled={disabled && optionValue !== current}>
        {label}
        {optionValue === current ? " (huidig)" : ""}
      </option>
    );
  };

  return (
    <details className="rounded-3xl bg-white p-6">
      <summary className="cursor-pointer font-display text-xl font-medium text-medium-green">
        {preview ? "Status handmatig aanpassen" : "Order handmatig doorzetten"}
      </summary>
      <p className="mt-2 text-sm text-text-muted">
        {preview
          ? "Als er iets is misgelopen, of om een Palley of order meteen naar een latere stap te sturen. Bestanden en Meshy-taken blijven zoals ze zijn."
          : "Stuurt de hele order meteen naar een latere stap, bv. als hij buiten de gewone weg gemaakt is."}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
        <label className="block">
          <span className="font-label font-semibold text-text-muted">{preview ? "Nieuwe stap" : "Stap"}</span>
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 h-12 w-full rounded-[15px] bg-off-white-dark px-4 font-label text-base font-semibold text-medium-green outline-none focus-visible:ring-3 focus-visible:ring-accent-highlights"
          >
            {!current && (
              <option value="" disabled>
                Kies een stap
              </option>
            )}
            {preview &&
              PREVIEW_GROUPS.map((group) => (
                <optgroup key={group.page} label={group.page}>
                  {group.steps.map((target) =>
                    option({ kind: "preview", ...target }, target.label ?? previewStatusLabel(target.status)),
                  )}
                </optgroup>
              ))}
            {order &&
              ["Batches", "Productie", "Afgerond"].map((page) => (
                <optgroup key={page} label={`${page} (hele order)`}>
                  {ORDER_STEPS.filter((target) => ORDER_STEP_PAGES[target] === page).map((target) =>
                    option({ kind: "order", step: target }, ORDER_STEP_LABELS[target], !reachable.includes(target)),
                  )}
                </optgroup>
              ))}
            {preview && (
              <optgroup label="Overig">
                {OTHER_PREVIEW_STEPS.map((target) => option({ kind: "preview", status: target.status }, target.label))}
              </optgroup>
            )}
          </select>
        </label>

        {step && value !== current && <StepNote step={step} preview={preview} order={order} />}

        {step?.kind === "order" && step.step === "BATCH" && value !== current && order && (
          <label className="block">
            <span className="font-label font-semibold text-text-muted">Batch</span>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="mt-1 h-12 w-full rounded-[15px] bg-off-white-dark px-4 font-label text-base font-semibold text-medium-green outline-none focus-visible:ring-3 focus-visible:ring-accent-highlights"
            >
              <option value="">Nieuwe batch</option>
              {order.openBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.ref}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="font-label font-semibold text-text-muted">Reden</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            required
            minLength={3}
            maxLength={500}
            placeholder={preview ? "bv. Meshy-webhook kwam nooit binnen" : "bv. Zelf geprint en al overhandigd"}
            className="mt-1 w-full resize-none rounded-[15px] bg-off-white-dark px-4 py-3 font-label text-base font-semibold text-medium-green placeholder:text-placeholder outline-none focus-visible:ring-3 focus-visible:ring-accent-highlights"
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          loading={loading}
          disabled={!step || value === current || reason.trim().length < 3}
        >
          {step?.kind === "order" || !preview ? "Order doorzetten" : "Status aanpassen"}
        </Button>
        {error && (
          <p role="alert" className="text-[#a3341a]">
            {error}
          </p>
        )}
      </form>

      {preview && preview.history.length > 0 && (
        <ul className="mt-5 space-y-3 border-t border-off-white-dark pt-4 text-xs">
          {preview.history.map((change) => (
            <li key={change.createdAt}>
              <p className="font-label font-bold text-medium-green">
                {previewStatusLabel(change.fromStatus)} → {previewStatusLabel(change.toStatus)}
              </p>
              <p className="text-text-muted">
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

/** What the chosen step does besides moving it, and what it still lacks: said before the admin confirms. */
function StepNote({ step, preview, order }: { step: Step; preview?: PreviewTarget; order?: OrderTarget }) {
  let text: string | null = null;
  if (step.kind === "order") {
    const what: Record<OrderStep, string> = {
      BATCH: "De order komt in een batch, ook als nog niet alles printklaar is.",
      AT_JLC: "De order gaat in een eigen batch naar JLC (tenzij hij al alleen in een open batch zit) en staat op In productie.",
      POST_PRODUCTION: "De order gaat in een eigen batch naar JLC en meteen naar postproductie: daar vink je af en verzend je.",
      FINISHED: "Alle items worden afgevinkt en de order staat op verzonden of overhandigd. De klant krijgt geen mail.",
    };
    text = `De hele order ${order?.number ?? ""} gaat mee. ${what[step.step]} Palleys op maat die nog niet klaar zijn voor print, komen op Klaar voor print; zonder printbestand ontbreken ze in de zip voor JLC.`;
  } else if (step.status === "PRINT_READY" && preview && !preview.hasProcessedFile) {
    text = "Er is nog geen printklare zip: zonder die ontbreekt deze Palley in de zip voor JLC. Upload hem op Processed of hierboven als eigen 3D-model.";
  } else if (step.status === "APPROVED" && preview && !preview.hasModel) {
    text = "Er is nog geen 3D-model: op Goedgekeurd valt er dan niets te downloaden.";
  }
  if (!text) return null;
  return <p className="rounded-2xl bg-off-white-dark p-3 text-text-muted">{text}</p>;
}
