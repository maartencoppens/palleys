"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import Button from "@/components/design/Button";
import { publishCart } from "@/core/hooks/useCartSnapshot";
import { usePollStatus } from "@/core/hooks/usePollStatus";
import { fetchOrderStatus } from "@/core/modules/orders/api";
import type { OrderStatusView } from "@/core/modules/checkout/types";
import { RETURN_POLL_INTERVAL_MS, RETURN_POLL_MAX_MS } from "@/data/checkout";

const PAID: OrderStatusView["status"][] = ["PAID", "IN_PRODUCTION", "SHIPPED"];
const CLOSED: OrderStatusView["status"][] = ["CANCELLED", "EXPIRED"];

/*
 * Where Bancontact sends the customer back. Arriving here proves nothing: the page asks our server, which asks
 * Bancontact, until the order is paid or closed. The link carries a token so nobody else can read the status.
 */
export default function CheckoutReturn() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const token = params.get("t");

  const fetcher = useMemo(
    () => (orderId && token ? () => fetchOrderStatus(orderId, token) : null),
    [orderId, token],
  );
  const isDone = useCallback(
    (data: OrderStatusView) => PAID.includes(data.status) || CLOSED.includes(data.status) || data.status === "REFUNDED",
    [],
  );
  const poll = usePollStatus(fetcher, isDone, { intervalMs: RETURN_POLL_INTERVAL_MS, maxMs: RETURN_POLL_MAX_MS });
  const status = poll.data?.status;
  const paid = status !== undefined && PAID.includes(status);

  // Paid previews drop out of the cart server-side; refresh the navbar badge.
  useEffect(() => {
    if (paid) publishCart(null);
  }, [paid]);

  const card = "flex flex-col items-start gap-4 rounded-3xl bg-white p-6 md:rounded-[32px] md:p-10";

  if (poll.status === "error") {
    return (
      <div role="alert" className={card}>
        <h1 className="font-display text-3xl font-bold text-medium-green">Deze link werkt niet</h1>
        <p className="text-base text-text-primary md:text-lg">
          We vinden deze bestelling niet. Kreeg je een bevestigingsmail? Dan is alles in orde. Twijfel je, neem dan contact
          met ons op.
        </p>
        <Button variant="primary" href="/">
          Naar de homepage
        </Button>
      </div>
    );
  }

  if (paid) {
    return (
      <div role="status" className={card}>
        <span className="grid size-14 place-items-center rounded-full bg-medium-green" aria-hidden>
          <Image src="/images/create/check.svg" width={24} height={18} alt="" />
        </span>
        <h1 className="font-display text-3xl font-bold text-medium-green md:text-4xl">Bedankt voor je bestelling!</h1>
        <p className="text-base text-text-primary md:text-lg">
          Je betaling is gelukt. Bestelnummer <strong className="font-label">{poll.data?.number}</strong>. Je krijgt een
          bevestiging per mail, en ons team in Gent gaat aan de slag met je Palley.
        </p>
        <Button variant="primary" href="/">
          Terug naar de winkel
        </Button>
      </div>
    );
  }

  if (status && CLOSED.includes(status)) {
    return (
      <div role="alert" className={card}>
        <h1 className="font-display text-3xl font-bold text-medium-green">De betaling is niet gelukt</h1>
        <p className="text-base text-text-primary md:text-lg">
          Er is niets aangerekend. Je Palleys staan nog in je winkelmandje, dus je kunt het meteen opnieuw proberen.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" href="/checkout">
            Opnieuw afrekenen
          </Button>
          <Button variant="secondary" href="/cart">
            Naar winkelmandje
          </Button>
        </div>
      </div>
    );
  }

  if (poll.status === "timeout") {
    return (
      <div role="status" className={card}>
        <h1 className="font-display text-3xl font-bold text-medium-green">Je betaling wordt nog verwerkt</h1>
        <p className="text-base text-text-primary md:text-lg">
          Dit duurt langer dan normaal. Zodra je bank de betaling bevestigt, krijg je een mail
          {poll.data ? ` voor bestelling ${poll.data.number}` : ""}. Je hoeft niets opnieuw te doen.
        </p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Opnieuw controleren
        </Button>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className={card}>
      <span className="size-10 animate-spin rounded-full border-4 border-light-green border-t-medium-green" aria-hidden />
      <h1 className="font-display text-3xl font-bold text-medium-green">Je betaling wordt verwerkt…</h1>
      <p className="text-base text-text-primary md:text-lg">Even geduld, dit duurt meestal maar een paar seconden.</p>
    </div>
  );
}
