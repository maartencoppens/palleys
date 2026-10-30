"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/design/Button";
import { useCartSnapshot } from "@/core/hooks/useCartSnapshot";
import { gsap, prefersReducedMotion, useGSAP } from "@/core/utils/gsap";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  links: { label: string; href: string }[];
  /** The hamburger button, which gets focus back when the menu closes. */
  toggleRef: RefObject<HTMLButtonElement | null>;
};

/*
 * Mobile menu: with only three links and a cart, a full-screen takeover would feel empty, so this is a
 * green sheet that drops down from the top over a dimmed page. Tapping the dimmed area, a link,
 * the close button or pressing Escape closes it.
 *
 * Accessibility: it's a modal dialog – focus moves to the close button on open, Tab stays inside the
 * sheet, the page behind can't scroll, and focus returns to the hamburger button on close.
 * It renders in a portal on <body>, so it isn't affected by the navbar sliding in and out.
 */
export default function MobileMenu({
  open,
  onClose,
  links,
  toggleRef,
}: MobileMenuProps) {
  // Stays mounted while the closing animation plays.
  const [mounted, setMounted] = useState(false);
  if (open && !mounted) setMounted(true);

  // Tapping a link navigates away, so the menu closes instantly instead of animating: Next.js keeps the
  // previous page around, and a half-played closing animation would replay on coming back.
  const closeForNavigation = () => {
    setMounted(false);
    onClose();
  };

  const cartCount = useCartSnapshot().cart?.totalQuantity ?? 0;
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useGSAP(
    () => {
      if (!mounted) return;
      const fast = prefersReducedMotion();

      if (open) {
        gsap
          .timeline()
          .fromTo(
            "[data-menu-backdrop]",
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: fast ? 0 : 0.25 },
          )
          .fromTo(
            "[data-menu-sheet]",
            { yPercent: -100 },
            { yPercent: 0, duration: fast ? 0 : 0.5, ease: "power3.out" },
            0,
          )
          .fromTo(
            "[data-menu-item]",
            { autoAlpha: 0, y: 24, rotate: -3 },
            {
              autoAlpha: 1,
              y: 0,
              rotate: 0,
              duration: fast ? 0 : 0.45,
              stagger: fast ? 0 : 0.06,
              ease: "back.out(2)",
            },
            fast ? 0 : 0.15,
          );
      } else {
        gsap
          .timeline({ onComplete: () => setMounted(false) })
          .to("[data-menu-sheet]", {
            yPercent: -100,
            duration: fast ? 0 : 0.35,
            ease: "power2.in",
          })
          .to(
            "[data-menu-backdrop]",
            { autoAlpha: 0, duration: fast ? 0 : 0.25 },
            fast ? 0 : 0.1,
          );
      }
    },
    { dependencies: [open, mounted], scope: rootRef },
  );

  // Focus, scroll lock and keyboard handling while open.
  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable =
        sheetRef.current.querySelectorAll<HTMLElement>("a[href], button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      toggle?.focus();
    };
  }, [open, onClose, toggleRef]);

  if (!mounted) return null;

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-50 md:hidden">
      <div
        data-menu-backdrop
        className="absolute inset-0 bg-text-primary/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={sheetRef}
        data-menu-sheet
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="relative flex flex-col gap-8 rounded-b-[32px] bg-medium-green px-m pt-4 pb-8 text-off-white shadow-[0_24px_48px_rgb(0_0_0/0.25)]"
      >
        <div className="flex items-center justify-between">
          <Link
            href="/"
            onClick={closeForNavigation}
            aria-label="Palleys startpagina"
            className="rounded-full"
          >
            <Image src="/images/logo.svg" width={64} height={64} alt="" />
          </Link>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid size-12 place-items-center rounded-full bg-off-white/10 transition-colors hover:bg-off-white/20"
            aria-label="Menu sluiten"
          >
            <span className="relative block size-5" aria-hidden>
              <span className="absolute top-1/2 left-0 h-[3px] w-5 -translate-y-1/2 rotate-45 rounded-full bg-off-white" />
              <span className="absolute top-1/2 left-0 h-[3px] w-5 -translate-y-1/2 -rotate-45 rounded-full bg-off-white" />
            </span>
          </button>
        </div>

        <nav aria-label="Hoofdmenu">
          <ul className="flex flex-col">
            {[...links, { label: "Winkelmandje", href: "/cart" }].map(
              (link) => (
                <li
                  key={link.href}
                  data-menu-item
                  className="border-b border-off-white/15"
                >
                  <Link
                    href={link.href}
                    onClick={closeForNavigation}
                    className="group flex items-center justify-between py-4 font-display text-[28px] leading-[1.2] font-medium transition-colors hover:text-accent-highlights"
                  >
                    <span className="flex items-center gap-3">
                      {link.label}
                      {link.href === "/cart" && cartCount > 0 && (
                        <span className="grid h-7 min-w-7 place-items-center rounded-full bg-accent-highlights px-2 font-label text-base font-extrabold text-medium-green">
                          {cartCount}
                        </span>
                      )}
                    </span>
                    <Image
                      className="transition-transform group-hover:translate-x-1"
                      src="/images/arrow-sm.svg"
                      width={19.5}
                      height={15.5}
                      alt=""
                      aria-hidden
                    />
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div
          data-menu-item
          className="flex flex-col items-stretch gap-3"
          onClickCapture={closeForNavigation}
        >
          {/* Only when "Create your own" isn't already one of the links above. */}
          {!links.some((link) => link.href === "/create") && (
            <Button href="/create">Maak je Palley</Button>
          )}
          <p className="text-center text-sm text-off-white/75">
            Met de hand gemaakt in Gent · 50% van de winst naar dieren
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
