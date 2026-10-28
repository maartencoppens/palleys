"use client";

import { usePathname } from "next/navigation";
import {
  gsap,
  prefersReducedMotion,
  ScrollTrigger,
  useGSAP,
} from "@/core/utils/gsap";

/*
 * All page animations in one place. Sections opt in with data attributes, so they stay server
 * components and the motion language stays consistent:
 *
 *   data-nav-item      navbar items that drop in on load
 *   data-hero-item     hero content that hops in on load, in DOM order
 *   data-hero-art      the hero artwork settles into place (scale only: it never starts hidden,
 *                      so the page background can't flash through on load)
 *   data-animate="…"   scroll reveals, played once when the element comes into view:
 *     fade-up   soft rise for text and headers
 *     pop       playful scale-and-tilt for images and cards
 *     stagger   the children hop in one after another, like pets lining up
 *     wiggle    a happy little wag, for icon badges
 *     rays      the children burst out from the centre (charity tag rays)
 *     leaves    slides in from the side with a slight sway (decorative foliage)
 *
 *   data-sway          plants that keep gently floating, so the page feels alive:
 *     scene     inline SVG: every leaf and flower sways on its own (hinged at the stem, flowers spin)
 *     cluster   the whole element sways as one (e.g. a leaf image)
 *   The floating pauses while it's off screen.
 *
 * Motion is short (under ~0.8s), runs once, never blocks interaction and is skipped completely
 * when the visitor prefers reduced motion.
 *
 * Each page renders this at the end, not the root layout: that way it only runs once the page's own
 * content has hydrated (running earlier would touch elements React hasn't taken over yet).
 */
const REVEAL_START = "top 88%";

export default function SiteAnimations() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const show = (targets: gsap.TweenTarget) =>
        gsap.set(targets, { autoAlpha: 1, clearProps: "transform" });

      if (prefersReducedMotion()) {
        show("[data-nav-item], [data-hero-item], [data-animate]");
        return;
      }

      // --- Load-in: navbar first, then the hero content hops in.
      const intro = gsap.timeline({ defaults: { ease: "back.out(1.7)" } });
      intro.fromTo(
        "[data-nav-item]",
        { autoAlpha: 0, y: -18 },
        { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.07 },
      );
      intro.fromTo(
        "[data-hero-art]",
        { scale: 1.06 },
        { scale: 1, duration: 1.1, ease: "power2.out" },
        0,
      );
      intro.fromTo(
        "[data-hero-item]",
        { autoAlpha: 0, y: 36, rotate: -2 },
        { autoAlpha: 1, y: 0, rotate: 0, duration: 0.7, stagger: 0.1 },
        0.15,
      );

      // --- Scroll reveals, each played once. Hidden by opacity up front, so the CSS fallback that
      // turns visibility back on after 2s doesn't show them before their reveal.
      gsap.set(
        "[data-animate='fade-up'], [data-animate='pop'], [data-animate='leaves']",
        { autoAlpha: 0 },
      );
      const reveal = (
        selector: string,
        from: gsap.TweenVars,
        to: gsap.TweenVars,
      ) =>
        ScrollTrigger.batch(selector, {
          start: REVEAL_START,
          once: true,
          onEnter: (elements: Element[]) =>
            gsap.fromTo(elements, from, {
              ...to,
              stagger: 0.1,
              overwrite: true,
            }),
        });

      reveal(
        "[data-animate='fade-up']",
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" },
      );
      reveal(
        "[data-animate='pop']",
        { autoAlpha: 0, scale: 0.88, rotate: -4 },
        {
          autoAlpha: 1,
          scale: 1,
          rotate: 0,
          duration: 0.8,
          ease: "back.out(1.6)",
        },
      );
      reveal(
        "[data-animate='leaves']",
        { autoAlpha: 0, x: 60, rotate: 6 },
        { autoAlpha: 1, x: 0, rotate: 0, duration: 1, ease: "power3.out" },
      );

      gsap.utils
        .toArray<HTMLElement>("[data-animate='stagger']")
        .forEach((group: HTMLElement) => {
          const items = Array.from(group.children);
          gsap.set(items, { autoAlpha: 0 });
          gsap.set(group, { autoAlpha: 1 });
          ScrollTrigger.create({
            trigger: group,
            start: REVEAL_START,
            once: true,
            onEnter: () =>
              gsap.fromTo(
                items,
                { autoAlpha: 0, y: 48, rotate: () => gsap.utils.random(-4, 4) },
                {
                  autoAlpha: 1,
                  y: 0,
                  rotate: 0,
                  duration: 0.7,
                  stagger: 0.12,
                  ease: "back.out(1.7)",
                },
              ),
          });
        });

      gsap.utils
        .toArray<HTMLElement>("[data-animate='wiggle']")
        .forEach((badge: HTMLElement) => {
          gsap.set(badge, { autoAlpha: 1 });
          ScrollTrigger.create({
            trigger: badge,
            start: "top 80%",
            once: true,
            onEnter: () =>
              gsap.fromTo(
                badge,
                { rotate: 0 },
                {
                  keyframes: { rotate: [0, -10, 8, -5, 3, 0] },
                  duration: 0.9,
                  ease: "power1.inOut",
                  delay: 0.3,
                },
              ),
          });
        });

      gsap.utils
        .toArray<HTMLElement>("[data-animate='rays']")
        .forEach((group: HTMLElement) => {
          const rays = group.querySelectorAll("[data-ray]");
          gsap.set(rays, { scale: 0 });
          gsap.set(group, { autoAlpha: 1 });
          ScrollTrigger.create({
            trigger: group,
            start: "top 85%",
            once: true,
            onEnter: () =>
              gsap.to(rays, {
                scale: 1,
                duration: 0.5,
                stagger: 0.06,
                ease: "back.out(3)",
                delay: 0.35,
              }),
          });
        });

      // --- Floating plants: slow, small and out of sync, like leaves in a light breeze.
      const sway = (
        element: Element,
        origin: string,
        maxRotate: number,
        maxShift: number,
      ) =>
        gsap.to(element, {
          rotation: gsap.utils.random(-maxRotate, maxRotate),
          y: gsap.utils.random(-maxShift, maxShift),
          transformOrigin: origin,
          duration: gsap.utils.random(2.2, 4),
          delay: gsap.utils.random(0, 1.5),
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

      gsap.utils.toArray<HTMLElement>("[data-sway]").forEach((container: HTMLElement) => {
        const tweens =
          container.dataset.sway === "scene"
            ? Array.from(
                container.querySelectorAll<Element>("#Leaves > *, #leaf21"),
              ).map((plant: Element) =>
                plant.id.startsWith("flower")
                  ? sway(plant, "50% 50%", 16, 5)
                  : sway(plant, "50% 100%", 6, 8),
              )
            : [sway(container, "100% 100%", 2.5, 6)];

        ScrollTrigger.create({
          trigger: container,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self: ScrollTrigger) =>
            tweens.forEach((tween) => tween.paused(!self.isActive)),
        });
      });

      // Images load after the first layout pass; recalculate trigger positions once they're in.
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener("load", refresh);
      return () => window.removeEventListener("load", refresh);
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  return null;
}
