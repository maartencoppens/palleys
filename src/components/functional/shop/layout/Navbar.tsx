"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import {
  gsap,
  prefersReducedMotion,
  ScrollTrigger,
  useGSAP,
} from "@/core/utils/gsap";
import CartMenu from "./CartMenu";
import MobileMenu from "./MobileMenu";

interface NavLink {
  label: string;
  href: string;
}

interface ScrollUpdateContext {
  scroll: () => number;
  direction: number;
}

const links: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Maak je Palley", href: "/create" },
  { label: "Over ons", href: "/about" },
];

/*
 * Site navbar. It starts in its own spot at the top of the page. Once the visitor scrolls past it, it
 * becomes a compact green bar fixed to the top that slides away while scrolling down (more room to
 * read) and slides back in as soon as they scroll up. Back at the top it returns to its original spot.
 *
 * While the fixed bar is visible, `--nav-offset` on <html> holds its height, so other sticky elements
 * (e.g. the create page stepper) can sit just below it instead of being covered.
 */
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuOpenRef = useRef(false);
  const cartOpenRef = useRef(false);
  // Set inside the scroll setup below: slides the fixed bar into view when it's hidden.
  const showBarRef = useRef<() => void>(() => {});

  const closeMenu = useCallback(() => {
    menuOpenRef.current = false;
    setMenuOpen(false);
  }, []);

  const setCartOpen = useCallback((open: boolean) => {
    cartOpenRef.current = open;
  }, []);
  const revealBar = useCallback(() => showBarRef.current(), []);

  useGSAP(() => {
    const slot = slotRef.current;
    const bar = barRef.current;
    if (!slot || !bar) return;

    const root = document.documentElement;
    const duration = prefersReducedMotion() ? 0 : 0.35;
    let isPinned = false;
    let isShown = false;

    const setShown = (shown: boolean) => {
      if (shown === isShown) return;
      isShown = shown;
      gsap.to(bar, {
        yPercent: shown ? 0 : -110,
        duration,
        ease: shown ? "power3.out" : "power2.in",
        overwrite: true,
      });
      gsap.to(root, {
        "--nav-offset": shown ? `${bar.offsetHeight}px` : "0px",
        duration,
        overwrite: true,
      });
    };

    showBarRef.current = () => {
      if (isPinned) setShown(true);
    };

    const pin = () => {
      isPinned = true;
      isShown = false;
      // Keep the original space so the page doesn't jump when the bar leaves the flow.
      slot.style.height = `${slot.offsetHeight}px`;
      gsap.set(bar, { yPercent: -110 });
      setPinned(true);
    };

    const unpin = () => {
      isPinned = false;
      isShown = false;
      gsap.killTweensOf(bar);
      gsap.set(bar, { clearProps: "transform" });
      gsap.set(root, { "--nav-offset": "0px" });
      slot.style.height = "";
      setPinned(false);
    };

    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self: ScrollUpdateContext) => {
        const scrollY = self.scroll();
        const slotTop = slot.getBoundingClientRect().top + scrollY;
        const slotBottom = slotTop + slot.offsetHeight;

        if (scrollY <= slotTop) {
          if (isPinned) unpin();
          return;
        }
        if (!isPinned) {
          if (scrollY > slotBottom) pin();
          return;
        }
        // Keep the bar in view while the mobile menu or the mini cart is open.
        setShown(
          self.direction === -1 || menuOpenRef.current || cartOpenRef.current,
        );
      },
    });

    return () => {
      trigger.kill();
      gsap.set(root, { "--nav-offset": "0px" });
    };
  });

  return (
    <div ref={slotRef}>
      <header
        ref={barRef}
        className={
          pinned
            ? "fixed inset-x-0 top-0 z-40 bg-medium-green/95 shadow-[0_8px_24px_rgb(0_0_0/0.18)] backdrop-blur-sm"
            : "relative"
        }
      >
        <div
          className={`relative flex items-center justify-between ${pinned ? "page-container py-2" : ""}`}
        >
          <Link
            href="/"
            className="shrink-0 rounded-full"
            aria-label="Palleys startpagina"
            data-nav-item
          >
            <Image
              className={`h-auto transition-[width] duration-300 ${pinned ? "w-14 md:w-16" : "w-[clamp(72px,7.43vw,107px)]"}`}
              src="/images/footer/palleys-logo.svg"
              width={107}
              height={107}
              alt=""
              priority
            />
          </Link>

          <nav
            className="flex items-center gap-s md:gap-8 md:pl-5 lg:gap-12"
            aria-label="Hoofdmenu"
          >
            <ul className="hidden items-center gap-10 md:flex lg:gap-[70px]">
              {links.map((link) => (
                <li key={link.href} data-nav-item>
                  <Link
                    href={link.href}
                    className="relative block text-xl leading-[21px] font-bold text-text-secondary transition-colors after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-accent-highlights after:transition-transform after:duration-300 hover:text-accent-highlights hover:after:scale-x-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Separates the page links from the cart, so the cart reads as its own action. */}
            <span
              className="hidden h-7 w-px bg-text-secondary/30 md:block"
              aria-hidden
              data-nav-item
            />

            <CartMenu
              pinned={pinned}
              onOpenChange={setCartOpen}
              onReveal={revealBar}
            />

            <button
              ref={toggleRef}
              type="button"
              className="grid size-11 place-content-center gap-[5px] rounded-lg md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-haspopup="dialog"
              onClick={() => {
                menuOpenRef.current = true;
                setMenuOpen(true);
              }}
              data-nav-item
            >
              <span className="sr-only">Menu openen</span>
              <span
                className="h-[3px] w-[26px] rounded-full bg-text-secondary"
                aria-hidden
              />
              <span
                className="h-[3px] w-[20px] justify-self-end rounded-full bg-text-secondary"
                aria-hidden
              />
              <span
                className="h-[3px] w-[26px] rounded-full bg-text-secondary"
                aria-hidden
              />
            </button>
          </nav>
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={closeMenu}
        links={links}
        toggleRef={toggleRef}
      />
    </div>
  );
}
