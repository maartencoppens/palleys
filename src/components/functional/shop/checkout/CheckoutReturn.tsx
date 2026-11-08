"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import Button from "@/components/design/Button";
import { publishCart } from "@/core/hooks/useCartSnapshot";
import { useLocale, useMessages } from "@/core/locale/client";
import { formatPrice } from "@/core/utils/format";
import { fill, fillNodes } from "@/core/locale/fill";
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
  const messages = useMessages();
  const { orderReturn: m } = messages;
  const locale = useLocale();
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
        <h1 className="font-display text-3xl font-bold text-medium-green">{m.errorTitle}</h1>
        <p className="text-base text-text-primary md:text-lg">
          {m.errorText}
        </p>
        <Button variant="primary" href="/">
          {m.home}
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
        <h1 className="font-display text-3xl font-bold text-medium-green md:text-4xl">{m.paidTitle}</h1>
        <p className="text-base text-text-primary md:text-lg">
          {fillNodes(m.paidText, { number: <strong className="font-label">{poll.data?.number}</strong> })}
        </p>
        {poll.data && <PaidSummary amounts={poll.data.amounts} title={m.summaryTitle} labels={messages.checkout} free={messages.shipping.free} locale={locale} />}
        <Button variant="primary" href="/">
          {m.backToShop}
        </Button>
      </div>
    );
  }

  if (status && CLOSED.includes(status)) {
    return (
      <div role="alert" className={card}>
        <h1 className="font-display text-3xl font-bold text-medium-green">{m.closedTitle}</h1>
        <p className="text-base text-text-primary md:text-lg">
          {m.closedText}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" href="/checkout">
            {m.payAgain}
          </Button>
          <Button variant="secondary" href="/cart">
            {m.toCart}
          </Button>
        </div>
      </div>
    );
  }

  if (poll.status === "timeout") {
    return (
      <div role="status" className={card}>
        <h1 className="font-display text-3xl font-bold text-medium-green">{m.timeoutTitle}</h1>
        <p className="text-base text-text-primary md:text-lg">
          {poll.data ? fill(m.timeoutTextNumber, { number: poll.data.number }) : m.timeoutText}
        </p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          {m.checkAgain}
        </Button>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className={card}>
      <span className="size-10 animate-spin rounded-full border-4 border-light-green border-t-medium-green" aria-hidden />
      <h1 className="font-display text-3xl font-bold text-medium-green">{m.waitTitle}</h1>
      <p className="text-base text-text-primary md:text-lg">{m.waitText}</p>
    </div>
  );
}

/** What was paid: products, discount, delivery and total, the same lines as the checkout and the mail. */
function PaidSummary({
  amounts,
  title,
  labels,
  free,
  locale,
}: {
  amounts: OrderStatusView["amounts"];
  title: string;
  labels: { subtotal: string; discount: string; shipping: string; total: string };
  free: string;
  locale: ReturnType<typeof useLocale>;
}) {
  const price = (cents: number) => formatPrice(cents / 100, locale);
  const row = "flex justify-between gap-4";
  return (
    <section aria-label={title} className="w-full max-w-sm">
      <dl className="flex flex-col gap-2 border-y border-off-white-dark py-3 text-base">
        <div className={row}>
          <dt>{labels.subtotal}</dt>
          <dd className="font-label font-semibold">{price(amounts.subtotalCents)}</dd>
        </div>
        {amounts.discountCents > 0 && (
          <div className={`${row} text-medium-green`}>
            <dt>{labels.discount}</dt>
            <dd className="font-label font-semibold">- {price(amounts.discountCents)}</dd>
          </div>
        )}
        <div className={row}>
          <dt>{labels.shipping}</dt>
          <dd className="font-label font-semibold">{amounts.shippingCents === 0 ? free : price(amounts.shippingCents)}</dd>
        </div>
        <div className={`${row} text-lg`}>
          <dt className="font-semibold">{labels.total}</dt>
          <dd className="font-label font-extrabold">{price(amounts.totalCents)}</dd>
        </div>
      </dl>
    </section>
  );
}
