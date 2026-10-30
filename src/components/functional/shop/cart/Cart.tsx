"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/design/Badge";
import Button from "@/components/design/Button";
import { palleyCount } from "@/components/functional/shop/layout/CartMenu";
import { loadCart, publishCart } from "@/core/hooks/useCartSnapshot";
import { deleteCartLine, patchCartLine } from "@/core/modules/shopify/api";
import type { CartView } from "@/core/modules/shopify/types";
import { formatPrice } from "@/core/utils/format";
import { RETURN_NOTE } from "@/data/options";
import CartLinePhoto from "./CartLinePhoto";
import QuantityStepper from "./QuantityStepper";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; cart: CartView | null };

// What happens after "Afrekenen", so the hand-off to Shopify doesn't feel like the end of the road.
const nextSteps = [
  { title: "Veilig afrekenen", text: "Je vult je adres in en betaalt via de beveiligde kassa van Shopify." },
  { title: "Wij gaan aan de slag", text: "Ons team in Gent werkt het 3D-model van je huisdier met de hand bij en print het." },
  { title: "In je bus", text: "Binnen 2–3 weken valt je Palley in je brievenbus." },
];

/*
 * Cart page: reads the Shopify cart through our API (the cart ID lives in an httpOnly cookie) and hands
 * off to Shopify's hosted checkout. Expired uploads are already removed server-side before we get here.
 * Every change is shared with the navbar's mini cart through useCartSnapshot.
 */
export default function Cart() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [removing, setRemoving] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const busyLine = removing ?? updating;
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCart()
      .then((cart) => !cancelled && setState({ status: "ready", cart }))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, []);

  // Coming back from Shopify with the back button restores this page as it was: undo "Even geduld…".
  useEffect(() => {
    const onPageShow = () => setRedirecting(false);
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const changeQuantity = async (lineId: string, quantity: number) => {
    setUpdating(lineId);
    try {
      const cart = await patchCartLine(lineId, quantity);
      publishCart(cart);
      setState({ status: "ready", cart });
    } catch {
      setState({ status: "error" });
    } finally {
      setUpdating(null);
    }
  };

  const remove = async (lineId: string) => {
    setRemoving(lineId);
    try {
      const cart = await deleteCartLine(lineId);
      publishCart(cart);
      setState({ status: "ready", cart });
    } catch {
      setState({ status: "error" });
    } finally {
      setRemoving(null);
    }
  };

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12" role="status" aria-label="Winkelmandje laden">
        <div className="flex flex-1 animate-pulse flex-col gap-6 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8">
          {[0, 1].map((key) => (
            <div key={key} className="flex items-center gap-4 md:gap-6">
              <div className="size-24 shrink-0 rounded-2xl bg-off-white-dark md:size-28" />
              <div className="flex flex-1 flex-col gap-3">
                <div className="h-5 w-1/2 rounded-full bg-off-white-dark" />
                <div className="h-4 w-1/3 rounded-full bg-off-white-dark" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-3xl bg-white md:rounded-[32px] lg:w-[420px]" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 rounded-3xl bg-white p-6 md:rounded-[32px] md:p-8">
        <p className="font-display text-2xl leading-[1.2] font-bold text-medium-green">
          We konden je winkelmandje niet laden
        </p>
        <p className="text-base leading-[1.5] text-text-primary">
          Geen zorgen, je Palleys zijn niet weg. Probeer het nog eens.
        </p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Opnieuw proberen
        </Button>
      </div>
    );
  }

  const cart = state.cart;
  if (!cart || cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-3xl bg-white px-6 py-10 text-center md:rounded-[32px] md:py-14">
        <div className="relative size-40 overflow-hidden rounded-full bg-light-yellow md:size-48">
          <Image
            src="/images/products/golden-retriever.png"
            alt=""
            fill
            sizes="192px"
            className="object-contain p-5"
          />
        </div>
        <div className="flex max-w-md flex-col gap-2">
          <p className="font-display text-2xl leading-[1.2] font-bold text-medium-green md:text-[32px]">
            Je winkelmandje is nog leeg
          </p>
          <p className="text-base leading-[1.5] text-text-primary md:text-lg">
            Upload een foto van je huisdier en wij maken er een Palley van, met de hand afgewerkt in Gent.
          </p>
        </div>
        <Button variant="primary" href="/create" className="px-8 py-3.5 text-lg">
          Maak je Palley
        </Button>
      </div>
    );
  }

  const checkout = (
    <a
      href={cart.checkoutUrl}
      onClick={() => setRedirecting(true)}
      aria-busy={redirecting}
      className="group flex items-center justify-center gap-3 rounded-pill bg-orange py-[18px] font-label text-lg leading-[normal] font-semibold text-off-white transition hover:bg-orange-hover active:scale-[0.98] aria-busy:opacity-80"
    >
      {redirecting ? "Even geduld…" : "Afrekenen"}
      <Image
        className="transition-transform group-hover:translate-x-1"
        src="/images/cta/arrow-right.svg"
        width={13.3333}
        height={13.3333}
        alt=""
        aria-hidden
      />
    </a>
  );

  return (
    <div className="flex flex-col gap-6 md:gap-8 lg:flex-row lg:items-start lg:gap-12">
      {/* Below lg this wrapper dissolves, so the summary can sit between the items and the next steps. */}
      <div className="contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-8">
        <section
          aria-labelledby="cart-lines-title"
          className="flex flex-col max-lg:order-1 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-off-white-dark pb-4 md:pb-5">
            <h2 id="cart-lines-title" className="font-display text-2xl leading-[1.2] font-bold text-medium-green">
              {palleyCount(cart.totalQuantity)}
            </h2>
            <Link
              href="/create"
              className="font-label text-base font-bold text-medium-green underline underline-offset-4 hover:text-orange"
            >
              + Nog een Palley maken
            </Link>
          </div>

          <ul className="flex flex-col" aria-label="Producten in je winkelmandje">
            {cart.lines.map((line) => (
              <li
                key={line.id}
                className={`flex gap-4 border-b border-off-white-dark py-5 transition-opacity last:border-b-0 last:pb-0 md:gap-6 md:py-6 ${busyLine === line.id ? "opacity-50" : ""}`}
              >
                <CartLinePhoto
                  photoUrl={line.photoUrl}
                  size={112}
                  className="size-20 rounded-2xl sm:size-24 md:size-28"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-lg leading-[1.2] font-bold text-medium-green md:text-xl">
                      {line.productTitle}
                    </p>
                    <div className="flex shrink-0 flex-col items-end">
                      <p className="font-label text-lg font-extrabold text-medium-green">
                        {formatPrice(line.total.amount)}
                      </p>
                      {line.quantity > 1 && (
                        <p className="text-xs text-text-muted">
                          {formatPrice(line.total.amount / line.quantity)} per stuk
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {line.animal && <Badge tone="success">{line.animal}</Badge>}
                    {line.edition && <Badge tone="waiting">{line.edition}</Badge>}
                  </div>
                  {line.notes && (
                    <p className="line-clamp-2 text-sm leading-[1.5] text-text-primary italic" title={line.notes}>
                      “{line.notes}”
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
                    <QuantityStepper
                      quantity={line.quantity}
                      onChange={(quantity) => changeQuantity(line.id, quantity)}
                      disabled={busyLine !== null}
                      label={line.animal ? `Palley · ${line.animal}` : line.productTitle}
                    />
                    <button
                      type="button"
                      onClick={() => remove(line.id)}
                      disabled={busyLine !== null}
                      className="flex items-center gap-1.5 rounded-full py-1 font-label text-sm font-bold text-orange transition-colors hover:text-orange-hover disabled:opacity-50"
                    >
                      <Image src="/images/create/trash.svg" width={13} height={14.3} alt="" aria-hidden />
                      {removing === line.id ? "Verwijderen…" : "Verwijder"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="next-steps-title" className="flex flex-col gap-5 rounded-3xl bg-light-yellow max-lg:order-3 p-5 md:rounded-[32px] md:p-8">
          <h2 id="next-steps-title" className="font-display text-xl leading-[1.2] font-bold text-medium-green md:text-2xl">
            Zo gaat het verder
          </h2>
          <ol className="grid gap-4 md:grid-cols-3 md:gap-6">
            {nextSteps.map((step, index) => (
              <li key={step.title} className="flex gap-3 md:flex-col">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-medium-green font-display text-base font-bold text-off-white"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1 text-text-primary">
                  <p className="font-label text-base font-bold">{step.title}</p>
                  <p className="text-sm leading-[1.5]">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside
        aria-labelledby="cart-summary-title"
        className="flex flex-col gap-5 rounded-3xl bg-white p-5 max-lg:order-2 md:rounded-[32px] md:p-8 lg:sticky lg:top-[calc(var(--nav-offset,0px)+2rem)] lg:w-[420px] lg:shrink-0"
      >
        <h2 id="cart-summary-title" className="font-display text-2xl leading-[1.2] font-bold text-medium-green md:text-[32px]">
          Overzicht
        </h2>
        <dl className="flex flex-col gap-3 text-base text-text-primary md:text-lg">
          <div className="flex items-center justify-between gap-4">
            <dt>Subtotaal ({palleyCount(cart.totalQuantity)})</dt>
            <dd className="font-label font-semibold">{formatPrice(cart.subtotal.amount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Verzending</dt>
            <dd className="font-label font-semibold text-placeholder">Bij het afrekenen</dd>
          </div>
        </dl>
        <hr className="border-text-primary" />
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-medium-green">
            <p className="font-display text-2xl leading-[1.2] font-medium">Totaal</p>
            <p className="font-label text-[32px] leading-[normal] font-extrabold">
              {formatPrice(cart.subtotal.amount)}
            </p>
          </div>
          <p className="text-sm leading-[1.5] text-text-primary">Incl. btw · verzendkosten bij het afrekenen</p>
        </div>

        {/* Shopify's hosted checkout: payments, taxes and shipping are handled there. On phones the sticky bar below takes over. */}
        <div className="hidden flex-col gap-3 lg:flex">
          {checkout}
          <p className="flex items-center justify-center gap-2 text-sm text-text-primary">
            <LockIcon />
            Veilig afrekenen via Shopify
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-[20px] bg-light-green/50 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-coral" aria-hidden>
            <Image src="/images/create/heart.svg" width={16.5} height={15} alt="" />
          </span>
          <p className="text-[15px] leading-[1.5] text-text-primary">
            50% van onze winst gaat naar de bescherming van dieren en hun leefgebied.
          </p>
        </div>
        <p className="text-sm leading-[1.5] text-text-muted">{RETURN_NOTE}</p>
      </aside>

      {/* Phones: total and checkout stay in reach while scrolling, and settle below the summary. */}
      <div className="sticky bottom-0 z-10 max-lg:order-4 -mx-5 flex items-center justify-between gap-4 rounded-t-3xl bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgb(0_0_0/0.12)] md:-mx-10 md:px-10 lg:hidden">
        <div className="flex flex-col">
          <p className="text-sm text-text-primary">Totaal</p>
          <p className="font-label text-2xl leading-[normal] font-extrabold text-medium-green">
            {formatPrice(cart.subtotal.amount)}
          </p>
        </div>
        <div className="flex-1 sm:max-w-xs">{checkout}</div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="size-4 text-medium-green" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
