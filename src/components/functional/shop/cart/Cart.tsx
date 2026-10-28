"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteCartLine, fetchCart } from "@/core/modules/shopify/api";
import type { CartView } from "@/core/modules/shopify/types";
import { formatPrice } from "@/core/utils/format";
import { RETURN_NOTE } from "@/data/options";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; cart: CartView | null };

/*
 * Cart page: reads the Shopify cart through our API (the cart ID lives in an httpOnly cookie) and hands
 * off to Shopify's hosted checkout. Expired uploads are already removed server-side before we get here.
 */
export default function Cart() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCart()
      .then((cart) => !cancelled && setState({ status: "ready", cart }))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = async (lineId: string) => {
    setRemoving(lineId);
    try {
      setState({ status: "ready", cart: await deleteCartLine(lineId) });
    } catch {
      setState({ status: "error" });
    } finally {
      setRemoving(null);
    }
  };

  if (state.status === "loading") {
    return <p className="text-lg text-text-primary" role="status">Winkelmandje laden…</p>;
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="font-label text-lg font-semibold text-[#a3341a]">
        We konden je winkelmandje niet laden. Vernieuw de pagina om het opnieuw te proberen.
      </p>
    );
  }

  const cart = state.cart;
  if (!cart || cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 rounded-3xl bg-white p-6 md:p-8">
        <p className="font-display text-2xl font-bold text-medium-green">Je winkelmandje is leeg</p>
        <p className="text-base leading-[1.5] text-text-primary">
          Upload een foto van je huisdier en wij maken er een Palley van.
        </p>
        <Link
          href="/create"
          className="rounded-full bg-orange px-6 py-3 font-label text-base font-semibold text-off-white transition hover:bg-orange-hover"
        >
          Maak je Palley
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
      <ul className="flex min-w-0 flex-1 flex-col gap-4" aria-label="Producten in je winkelmandje">
        {cart.lines.map((line) => (
          <li key={line.id} className="flex items-center gap-4 rounded-3xl bg-white p-4 md:gap-6 md:p-6">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-light-yellow md:size-24">
              {line.photoUrl ? (
                // Short-lived signed R2 URL of the customer's own photo: not for next/image's optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={line.photoUrl} alt="Je foto" className="size-full object-cover" />
              ) : (
                <Image
                  src="/images/products/golden-retriever.png"
                  alt=""
                  fill
                  sizes="96px"
                  className="object-contain p-2"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="font-label text-lg font-bold text-text-primary">{line.productTitle}</p>
              <p className="text-base text-text-primary">
                {[line.animal, line.edition].filter(Boolean).join(" · ")}
              </p>
              {line.notes && (
                <p className="truncate text-sm text-placeholder" title={line.notes}>
                  “{line.notes}”
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <p className="font-label text-lg font-extrabold text-medium-green">
                {formatPrice(line.total.amount)}
              </p>
              <button
                type="button"
                onClick={() => remove(line.id)}
                disabled={removing !== null}
                className="font-label text-sm font-bold text-medium-green underline underline-offset-4 disabled:opacity-50"
              >
                {removing === line.id ? "Verwijderen…" : "Verwijder"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <aside className="flex flex-col gap-5 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8 lg:w-[420px] lg:shrink-0">
        <div className="flex items-center justify-between text-medium-green">
          <p className="font-display text-2xl leading-[1.2] font-medium">Subtotaal</p>
          <p className="font-label text-[32px] leading-[normal] font-extrabold">
            {formatPrice(cart.subtotal.amount)}
          </p>
        </div>
        <p className="text-sm leading-[1.5] text-text-primary">
          Incl. btw · verzendkosten bij het afrekenen
        </p>
        <p className="text-sm leading-[1.5] text-text-primary">{RETURN_NOTE}</p>
        {/* Shopify's hosted checkout: payments, taxes and shipping are handled there. */}
        <a
          href={cart.checkoutUrl}
          className="flex items-center justify-center rounded-full bg-orange py-[18px] font-label text-lg font-semibold text-off-white transition hover:bg-orange-hover active:scale-[0.98]"
        >
          Afrekenen
        </a>
      </aside>
    </div>
  );
}
