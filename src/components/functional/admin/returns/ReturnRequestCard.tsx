"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/design/Button";
import { Badge, type BadgeTone } from "@/components/design/Badge";
import { Textarea } from "@/components/design/form";
import { PhotoThumbnails } from "@/components/functional/admin/PhotoThumbnails";
import { postReturnDecision } from "@/core/modules/returns/api";
import type { AdminReturnRequest } from "@/core/modules/returns/types";
import { getApiErrorMessage } from "@/core/networking/api";
import { formatDateTime } from "@/core/utils/format";
import { MAX_DECISION_NOTE_LENGTH } from "@/data/returns";
import type { ReturnStatus, ReturnType } from "@/db/generated/enums";

const TYPE_LABELS: Record<ReturnType, string> = { CANCELLATION: "Annulering", WITHDRAWAL: "Herroeping", WARRANTY: "Garantieclaim" };
const STATUS: Record<ReturnStatus, { label: string; tone: BadgeTone }> = {
  SUBMITTED: { label: "Nieuw", tone: "danger" },
  APPROVED: { label: "Goedgekeurd, nog afronden", tone: "waiting" },
  REJECTED: { label: "Afgewezen", tone: "neutral" },
  COMPLETED: { label: "Afgerond", tone: "success" },
};

/** What the team does once a request is approved, so "afgerond" means the same for everyone. */
function nextStep(request: AdminReturnRequest) {
  if (request.type === "WARRANTY" && request.resolution === "REPRINT") {
    return "Herprint gaat mee in een volgende batch. Afronden zodra hij verstuurd is.";
  }
  if (request.type === "WITHDRAWAL" && request.itemsReceived) {
    return "Wacht op het pakje of het verzendbewijs, betaal dan terug via het Bancontact Pro-portaal (incl. standaardverzendkosten) en rond af.";
  }
  return "Betaal terug via het Bancontact Pro-portaal en rond af.";
}

/* One return request in the backoffice: what the customer asked, their photos, and the team's three steps. */
export function ReturnRequestCard({ request, showOrder = false }: { request: AdminReturnRequest; showOrder?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | "complete" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const status = STATUS[request.status];

  async function decide(input: { action: "approve" | "complete" } | { action: "reject"; note: string }) {
    setBusy(input.action);
    setError(null);
    try {
      await postReturnDecision(request.id, input);
      setRejecting(false);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-off-white p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-label text-base font-bold">{TYPE_LABELS[request.type]}</h3>
        <Badge tone={status.tone}>{status.label}</Badge>
        {request.type === "WITHDRAWAL" && <Badge>{request.itemsReceived ? "Na ontvangst: klant stuurt terug" : "Nog niet verstuurd"}</Badge>}
        {request.resolution && <Badge>{request.resolution === "REPRINT" ? "Wil herprint" : "Wil terugbetaling"}</Badge>}
      </div>
      {showOrder && (
        <p>
          <Link href={`/admin/orders/${request.orderId}`} className="font-semibold text-medium-green underline underline-offset-4">
            {request.orderNumber}
          </Link>{" "}
          · {request.customerName}
        </p>
      )}
      <p className="text-text-muted">Ingediend {formatDateTime(request.submittedAt)}</p>
      <ul className="list-disc pl-5">
        {request.items.map((item) => (
          <li key={item.orderItemId}>
            {item.quantity} × {item.title} <span className="font-mono text-xs text-text-muted">{item.productCode}</span>
          </li>
        ))}
      </ul>
      {request.reason && <p className="whitespace-pre-line italic">“{request.reason}”</p>}
      {request.photoUrls.length > 0 && <PhotoThumbnails urls={request.photoUrls} className="size-16" />}
      {request.reprintOrder && (
        <p>
          Herprint:{" "}
          <Link href={`/admin/orders/${request.reprintOrder.id}`} className="font-semibold text-medium-green underline underline-offset-4">
            {request.reprintOrder.number}
          </Link>
        </p>
      )}
      {request.decidedAt && (
        <p className="text-text-muted">
          {request.status === "REJECTED" ? "Afgewezen" : "Goedgekeurd"} door {request.decidedBy} op {formatDateTime(request.decidedAt)}
          {request.decisionNote && `: ${request.decisionNote}`}
        </p>
      )}
      {request.completedAt && (
        <p className="text-text-muted">
          Afgerond door {request.completedBy} op {formatDateTime(request.completedAt)}
        </p>
      )}
      {request.status === "APPROVED" && <p className="font-semibold">{nextStep(request)}</p>}

      {request.status === "SUBMITTED" && !rejecting && (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" loading={busy === "approve"} loadingText="Bezig…" onClick={() => decide({ action: "approve" })}>
            Goedkeuren
          </Button>
          <Button variant="secondary" disabled={busy !== null} onClick={() => setRejecting(true)}>
            Afwijzen
          </Button>
        </div>
      )}
      {rejecting && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`reject-${request.id}`} className="font-label font-semibold text-text-muted">
            Waarom? Deze reden gaat naar de klant.
          </label>
          <Textarea
            id={`reject-${request.id}`}
            rows={3}
            maxLength={MAX_DECISION_NOTE_LENGTH}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-24 text-base!"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              loading={busy === "reject"}
              loadingText="Bezig…"
              disabled={note.trim().length < 5}
              onClick={() => decide({ action: "reject", note })}
            >
              Afwijzen en klant mailen
            </Button>
            <Button variant="secondary" disabled={busy !== null} onClick={() => setRejecting(false)}>
              Annuleren
            </Button>
          </div>
        </div>
      )}
      {request.status === "APPROVED" && (
        <Button variant="secondary" className="self-start" loading={busy === "complete"} loadingText="Bezig…" onClick={() => decide({ action: "complete" })}>
          Afgerond
        </Button>
      )}
      {error && (
        <p role="alert" className="font-semibold text-[#a3341a]">
          {error}
        </p>
      )}
    </article>
  );
}
