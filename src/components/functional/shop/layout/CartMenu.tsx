"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Button from "@/components/design/Button";
import CartLinePhoto from "@/components/functional/shop/cart/CartLinePhoto";
import QuantityStepper from "@/components/functional/shop/cart/QuantityStepper";
import { loadCart, publishCart, useCartSnapshot } from "@/core/hooks/useCartSnapshot";
import { Link, useLocale, useMessages } from "@/core/locale/client";
import { fill } from "@/core/locale/fill";
import { deleteCartLine, patchCartLine } from "@/core/modules/cart/api";
import type { CartLineView } from "@/core/modules/cart/types";
import type { Locale } from "@/core/locale/config";
import { formatPrice } from "@/core/utils/format";

type CartMenuProps = {
  /** True while the navbar is the compact fixed bar, whose row has its own side padding. */
  pinned: boolean;
  /** Lets the navbar stay in view while the mini cart is open. */
  onOpenChange: (open: boolean) => void;
  /** Called when a Palley was just added, so the navbar can slide back into view. */
  onReveal: () => void;
};

type Texts = ReturnType<typeof useMessages>;

export const palleyCount = (count: number, { cart }: Texts) => (count === 1 ? cart.countOne : fill(cart.countOther, { count }));

/** What a shopper calls a line: its name, or for a Palley what makes it theirs. */
export const lineName = (line: CartLineView, { cart }: Texts, locale: Locale) =>
  line.kind === "personalized" ? cart.personalized : line.productTitles[locale];

/** Hond · Met sleutelhanger · Klemmetje, in the shopper's language. Empty for a collectible. */
export function lineChoices(line: CartLineView, { options }: Texts, { withAnimal = true, withAttachment = true } = {}) {
  return [
    withAnimal && line.animal ? options.animals[line.animal] : null,
    line.edition ? options.editions[line.edition] : null,
    withAttachment && line.attachment ? options.attachments[line.attachment] : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/*
 * Cart button in the navbar with a mini cart. The icon carries a count badge and a chevron, so it's clear
 * it opens an overview instead of jumping straight to the cart page. The overview lists the Palleys in the
 * cart with the subtotal and leads to checkout or the full cart page. It opens by itself right after
 * something was added (see useCartSnapshot), and closes on Escape, a click outside it or following a link.
 */
export default function CartMenu({ pinned, onOpenChange, onReveal }: CartMenuProps) {
  const messages = useMessages();
  const locale = useLocale();
  const { cart: m, common } = messages;
  const { cart, loaded, revealedAt } = useCartSnapshot();
  const [open, setOpen] = useState(false);
  const [busyLine, setBusyLine] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mountedRevealRef = useRef(revealedAt);
  const pathname = usePathname();
  const [openPathname, setOpenPathname] = useState(pathname);

  // Next.js keeps visited pages around, so a page change closes it instead of leaving it open there.
  if (openPathname !== pathname) {
    setOpenPathname(pathname);
    if (open) setOpen(false);
  }

  const count = cart?.totalQuantity ?? 0;
  const lines = cart?.lines ?? [];

  const toggle = (next: boolean) => {
    setOpen(next);
    if (next) {
      setFailed(false);
      // Refreshes the overview (and the signed photo URLs) every time it opens.
      loadCart().catch(() => setFailed(true));
    }
  };

  // The badge needs the cart on every page; loadCart shares the request with the cart page.
  useEffect(() => {
    if (!loaded) loadCart().catch(() => setFailed(true));
  }, [loaded]);

  // Something was just added: show it. The value at mount is skipped, so a page change doesn't reopen it.
  useEffect(() => {
    if (revealedAt === mountedRevealRef.current) return;
    mountedRevealRef.current = revealedAt;
    setOpen(true);
    onReveal();
  }, [revealedAt, onReveal]);

  useEffect(() => onOpenChange(open), [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Removing a line and changing its quantity both update the shared cart the same way.
  const updateLine = async (lineId: string, request: () => ReturnType<typeof deleteCartLine>) => {
    setBusyLine(lineId);
    setFailed(false);
    try {
      publishCart(await request());
    } catch {
      setFailed(true);
    } finally {
      setBusyLine(null);
    }
  };

  const closeForNavigation = () => toggle(false);

  // Every line is the same product, so the pet tells them apart best.
  const miniTitle = (line: CartLineView) =>
    line.animal ? fill(m.palleyLine, { animal: messages.options.animals[line.animal] }) : line.productTitles[locale];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => toggle(!open)}
        aria-expanded={open}
        aria-controls="mini-cart"
        aria-haspopup="dialog"
        aria-label={count > 0 ? fill(m.mini.buttonCount, { count: palleyCount(count, messages) }) : m.mini.button}
        className={`group relative flex items-center gap-0.5 rounded-pill py-0.5 pr-2.5 pl-1 transition-colors hover:bg-off-white/10 ${open ? "bg-off-white/15" : ""}`}
        data-nav-item
      >
        <Image
          className="transition-transform group-hover:-rotate-6"
          src="/images/cart.svg"
          width={44}
          height={44}
          alt=""
        />
        {count > 0 && (
          <span
            key={count}
            className="absolute top-0 left-7 grid h-[22px] min-w-[22px] animate-cart-badge motion-reduce:animate-none place-items-center rounded-full bg-accent-highlights px-1.5 font-label text-xs leading-none font-extrabold text-medium-green ring-2 ring-medium-green"
            aria-hidden
          >
            {count}
          </span>
        )}
        <svg
          className={`size-4 text-off-white transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Spans the navbar row, so on phones the panel can use the full width. */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-full z-50 flex justify-end pt-3 ${pinned ? "page-container" : ""}`}
      >
        <div
          ref={panelRef}
          id="mini-cart"
          role="dialog"
          aria-label={m.mini.label}
          className={`flex w-full origin-top-right flex-col overflow-hidden rounded-3xl bg-white text-text-primary shadow-[0_24px_48px_rgb(0_0_0/0.22)] transition duration-200 md:w-[400px] ${open ? "pointer-events-auto visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-2 scale-[0.98] opacity-0"}`}
        >
          <div className="flex items-center justify-between gap-4 border-b border-off-white-dark px-5 py-4">
            <p className="font-display text-xl leading-[1.2] font-bold text-medium-green">{m.mini.title}</p>
            {count > 0 && (
              <span className="rounded-full bg-light-green px-3 py-1 font-label text-sm font-bold text-medium-green">
                {palleyCount(count, messages)}
              </span>
            )}
          </div>

          {!loaded ? (
            <div className="flex flex-col gap-3 p-5" role="status" aria-label={m.loading}>
              {[0, 1].map((key) => (
                <div key={key} className="flex animate-pulse items-center gap-3">
                  <div className="size-14 rounded-2xl bg-off-white-dark" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-3.5 w-2/3 rounded-full bg-off-white-dark" />
                    <div className="h-3 w-1/3 rounded-full bg-off-white-dark" />
                  </div>
                </div>
              ))}
            </div>
          ) : lines.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-5 py-6 text-center">
              <div className="relative size-24 overflow-hidden rounded-full bg-light-yellow">
                <Image
                  src="/images/products/golden-retriever.png"
                  alt=""
                  fill
                  sizes="96px"
                  className="object-contain p-3"
                />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-label text-lg font-bold">{m.mini.emptyTitle}</p>
                <p className="text-sm leading-[1.5]">{m.mini.emptyText}</p>
              </div>
              <Button variant="primary" href="/create" onClick={closeForNavigation}>
                {common.createPalley}
              </Button>
            </div>
          ) : (
            <>
              <ul className="flex max-h-[min(320px,45vh)] flex-col overflow-y-auto px-5" aria-label={m.linesLabel}>
                {lines.map((line) => (
                  <li
                    key={line.id}
                    className={`flex items-center gap-3 border-b border-off-white-dark py-3 last:border-b-0 ${busyLine === line.id ? "opacity-50" : ""}`}
                  >
                    <CartLinePhoto photoUrl={line.photoUrl} size={56} className="size-14 rounded-2xl" />
                    <div className="flex min-w-0 flex-1 flex-col items-start">
                      <p className="truncate font-label text-base font-bold">{miniTitle(line)}</p>
                      {lineChoices(line, messages, { withAnimal: false }) && <p className="truncate text-sm">{lineChoices(line, messages, { withAnimal: false })}</p>}
                      <div className="mt-1.5">
                        <QuantityStepper
                          size="small"
                          quantity={line.quantity}
                          onChange={(quantity) => updateLine(line.id, () => patchCartLine(line.id, quantity))}
                          disabled={busyLine !== null}
                          label={miniTitle(line)}
                        />
                      </div>
                    </div>
                    <p className="shrink-0 font-label text-base font-extrabold text-medium-green">
                      {formatPrice(line.total.amount, locale)}
                    </p>
                    <button
                      type="button"
                      onClick={() => updateLine(line.id, () => deleteCartLine(line.id))}
                      disabled={busyLine !== null}
                      className="grid size-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-pink disabled:opacity-50"
                      aria-label={fill(m.removeLabel, { title: miniTitle(line) })}
                    >
                      <Image src="/images/create/trash.svg" width={15} height={16.5} alt="" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 bg-off-white p-5">
                <div className="flex items-baseline justify-between text-medium-green">
                  <p className="font-display text-lg font-medium">{m.mini.subtotal}</p>
                  <p className="font-label text-2xl font-extrabold">{formatPrice(cart!.subtotal.amount, locale)}</p>
                </div>
                <p className="-mt-2 text-sm">{m.summary.exclShipping}</p>
                {/* Our checkout: address and delivery, then Bancontact for the payment. */}
                <Link
                  href="/checkout"
                  onClick={closeForNavigation}
                  className="group flex items-center justify-center gap-3 rounded-pill bg-orange py-3.5 font-label text-base font-semibold text-off-white transition hover:bg-orange-hover active:scale-[0.98]"
                >
                  {common.checkout}
                  <Image
                    className="transition-transform group-hover:translate-x-1"
                    src="/images/cta/arrow-right.svg"
                    width={13.3333}
                    height={13.3333}
                    alt=""
                    aria-hidden
                  />
                </Link>
                <Button variant="secondary" href="/cart" onClick={closeForNavigation} className="w-full">
                  {m.mini.view}
                </Button>
              </div>
            </>
          )}

          {failed && (
            <p role="alert" className="px-5 pb-4 font-label text-sm font-semibold text-[#a3341a]">
              {m.mini.failed}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
