"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postResendConfirmation, postResolveAttention, postSyncOrderPayment } from "@/core/modules/orders/api";
import { getApiErrorMessage } from "@/core/networking/api";
import Button from "@/components/design/Button";
import { Textarea } from "@/components/design/form";

type OrderActionsProps = {
  orderId: string;
  canSyncPayment: boolean;
  canResendConfirmation: boolean;
  attentionReason: string | null;
};

/* Order actions in the backoffice: ask Stripe for the latest status, resend the mail, close a flagged problem. */
export function OrderActions({ orderId, canSyncPayment, canResendConfirmation, attentionReason }: OrderActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"sync" | "mail" | "resolve" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function run(action: "sync" | "mail" | "resolve", call: () => Promise<string>) {
    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      setMessage(await call());
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(null);
      router.refresh();
    }
  }

  if (!canSyncPayment && !canResendConfirmation && !attentionReason) return null;

  return (
    <section className="rounded-3xl bg-white p-6">
      <h2 className="font-display text-xl font-medium text-medium-green">Acties</h2>
      <div className="mt-4 flex flex-col gap-3">
        {canSyncPayment && (
          <Button
            variant="secondary"
            className="w-full px-4! whitespace-normal!"
            loading={busy === "sync"}
            loadingText="Ophalen bij Stripe…"
            onClick={() => run("sync", async () => `Status: ${(await postSyncOrderPayment(orderId)).status}`)}
          >
            Betaalstatus ophalen bij Stripe
          </Button>
        )}
        {canResendConfirmation && (
          <Button
            variant="secondary"
            className="w-full px-4! whitespace-normal!"
            loading={busy === "mail"}
            loadingText="Versturen…"
            onClick={() =>
              run("mail", async () =>
                (await postResendConfirmation(orderId)).sent
                  ? "Bevestigingsmail verstuurd"
                  : "Niet verstuurd. De reden staat bij Opvolgen; staat daar niets, dan is Resend niet ingesteld (RESEND_API_KEY, EMAIL_FROM).",
              )
            }
          >
            Bevestigingsmail opnieuw versturen
          </Button>
        )}
      </div>

      {attentionReason && (
        <div className="mt-6 flex flex-col gap-3 border-t border-off-white-dark pt-5">
          <label htmlFor="resolve-note" className="font-label text-sm font-semibold text-text-muted">
            Probleem afgehandeld? Schrijf kort wat je deed.
          </label>
          <Textarea
            id="resolve-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="bv. Terugbetaald via het Stripe-dashboard"
            className="min-h-24 text-base!"
          />
          <Button
            variant="primary"
            loading={busy === "resolve"}
            loadingText="Opslaan…"
            disabled={note.trim().length < 3}
            onClick={() =>
              run("resolve", async () => {
                await postResolveAttention(orderId, note.trim());
                setNote("");
                return "Gemarkeerd als afgehandeld";
              })
            }
          >
            Markeer als afgehandeld
          </Button>
        </div>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm text-medium-green">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#a3341a]">
          {error}
        </p>
      )}
    </section>
  );
}
