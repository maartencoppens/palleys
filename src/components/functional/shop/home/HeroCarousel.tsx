"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import type { Messages } from "@/core/locale/messages";
import { fill } from "@/core/locale/fill";
import { prefersReducedMotion } from "@/core/utils/gsap";

type HeroCarouselProps = {
  m: Messages["hero"]["flow"];
};

/** One photo per step of the flow, in the order of the copy's steps. */
const images = [
  "/images/hero-flow/photo.webp",
  "/images/hero-flow/pose.webp",
  "/images/hero-flow/model.webp",
  "/images/hero-flow/keychain.webp",
];

const STEP_ANGLE = 360 / images.length;
const STEP_DURATION = 3500;
/** How far (px) a swipe has to travel before it turns the wheel. */
const SWIPE_THRESHOLD = 40;
/** A photo travels about 1.6 times its width along the arc per step, so a drag of that length is one step. */
const DRAG_PER_STEP = 1.6;
/** Horizontal trackpad scroll needed for one step, and the pause before the next one counts. */
const WHEEL_THRESHOLD = 30;
const WHEEL_COOLDOWN = 700;

const subscribeToReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/*
 * "From photo to Palley": the four steps of the flow as round photos on a wheel that keeps turning,
 * after the Webflow circular carousel. Only the photo in the active slot is shown full size; its
 * neighbours peek in from the edge of the screen.
 *
 * The wheel is plain CSS. Every photo sits on the pivot and gets
 *   rotate(angle) translateX(radius) rotate(-angle)
 * so it lands on the circle but stays upright. Turning the wheel only changes --flow-turn: the
 * transform transition then moves each photo along the arc, counter-clockwise. The position keeps
 * counting up (never wraps), so the wheel always turns the same way instead of spinning back.
 *
 *   desktop  from 1280px, where the copy leaves room: the active slot is left of the pivot and tilted up a
 *            little (--flow-slot: 210deg), so the next photo comes in from the right edge and arcs over to
 *            it below the navbar; the previous one drops away at the bottom right.
 *   smaller  the active slot is on top (270deg), under the hero copy; the next photo comes in from the right.
 *
 * On desktop its box overlaps the end of the hero copy, so only the photo, caption and controls take clicks.
 * It plays on its own and pauses while hovered, focused or dragged. The visitor can turn it themselves
 * by swiping or dragging the photo (the wheel follows the finger), scrolling sideways on a trackpad,
 * the arrow keys or the dots. With "reduce motion" it doesn't play on its own and the photos switch without turning.
 */
export default function HeroCarousel({ m }: HeroCarouselProps) {
  const [position, setPosition] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // The swipe in progress: how far it moved and the photo's width at the start. null when nothing is dragged.
  const [drag, setDrag] = useState<{ dx: number; width: number } | null>(null);
  const dragStart = useRef(0);
  const wheel = useRef({ delta: 0, lockedUntil: 0 });
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion, () => false);

  const dragging = drag !== null;
  const turning = !reducedMotion && !hovered && !focused && !dragging;
  const active = ((position % images.length) + images.length) % images.length;

  useEffect(() => {
    if (!turning) return;
    const timer = setTimeout(() => setPosition((current) => current + 1), STEP_DURATION);
    return () => clearTimeout(timer);
  }, [turning, position]);

  // A dot turns the wheel the short way round.
  const goTo = (index: number) => {
    const steps = (index - active + images.length) % images.length;
    setPosition((current) => current + (steps > images.length / 2 ? steps - images.length : steps));
  };

  const step = (steps: number) => setPosition((current) => current + steps);

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") step(1);
    else if (event.key === "ArrowLeft") step(-1);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = event.clientX;
    setDrag({ dx: 0, width: event.currentTarget.offsetWidth });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag) setDrag({ ...drag, dx: event.clientX - dragStart.current });
  };

  // Swiping left brings the next photo in from the right; a long swipe can skip a photo.
  const onPointerUp = () => {
    if (drag && Math.abs(drag.dx) > SWIPE_THRESHOLD) {
      step(-Math.sign(drag.dx) * Math.max(1, Math.round(Math.abs(drag.dx) / (drag.width * DRAG_PER_STEP))));
    }
    setDrag(null);
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    const now = Date.now();
    if (now < wheel.current.lockedUntil) return;
    wheel.current.delta += event.deltaX;
    if (Math.abs(wheel.current.delta) < WHEEL_THRESHOLD) return;
    step(Math.sign(wheel.current.delta));
    wheel.current = { delta: 0, lockedUntil: now + WHEEL_COOLDOWN };
  };

  // While dragging, the wheel turns along with the pointer.
  const dragTurn = drag ? (-drag.dx / (drag.width * DRAG_PER_STEP)) * STEP_ANGLE : 0;

  return (
    <section
      data-hero-item
      aria-roledescription="carousel"
      aria-label={m.label}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      style={{ "--flow-turn": `${position * STEP_ANGLE + dragTurn}deg` } as CSSProperties}
      className="pointer-events-none relative flex flex-col items-center gap-l self-center pt-2 *:pointer-events-auto pb-24 [--flow-radius:calc(var(--flow-size)*1.08)] [--flow-size:min(54vw,240px)] [--flow-slot:270deg] md:pb-44 xl:absolute xl:inset-y-0 xl:right-[4%] xl:left-[54%] xl:justify-center xl:pt-24 xl:pb-0 xl:[--flow-radius:calc(var(--flow-size)*1.05)] xl:[--flow-size:clamp(260px,25vw,460px)] xl:[--flow-slot:210deg]"
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        onWheel={onWheel}
        className={`relative size-(--flow-size) touch-pan-y select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        {/* The pivot: one radius away from the active slot, on the opposite side. Clicks go through the wheel to the controls. */}
        <div className="pointer-events-none absolute top-[calc(50%-var(--flow-radius)*sin(var(--flow-slot)))] left-[calc(50%-var(--flow-radius)*cos(var(--flow-slot)))]">
          {/* The track the photos ride on. */}
          <span
            className="absolute -top-(--flow-radius) -left-(--flow-radius) size-[calc(var(--flow-radius)*2)] rounded-full border-2 border-dashed border-off-white/25"
            aria-hidden
          />

          <ul>
            {m.steps.map((step, index) => {
              const distance = (index - active + images.length) % images.length;
              return (
                <li
                  key={step.title}
                  aria-hidden={distance !== 0}
                  style={
                    {
                      "--angle": `calc(var(--flow-slot) + ${index * STEP_ANGLE}deg - var(--flow-turn))`,
                    } as CSSProperties
                  }
                  className={`absolute top-[calc(var(--flow-size)/-2)] left-[calc(var(--flow-size)/-2)] size-(--flow-size) [transform:rotate(var(--angle))_translateX(var(--flow-radius))_rotate(calc(var(--angle)*-1))] duration-1000 ease-[cubic-bezier(0.34,1.25,0.64,1)] motion-reduce:transition-none ${
                    dragging ? "transition-none" : "transition-transform"
                  }`}
                >
                  <div
                    className={`relative size-full transition-[scale,opacity] duration-1000 motion-reduce:transition-none ${
                      distance === 0 ? "scale-100" : "scale-[0.58]"
                    } ${distance === 2 ? "opacity-0" : "opacity-100"}`}
                  >
                    <Image
                      src={images[index]}
                      width={640}
                      height={640}
                      sizes="(min-width: 1280px) 460px, 240px"
                      loading="eager"
                      draggable={false}
                      alt={step.alt}
                      className="size-full rounded-full bg-off-white object-cover shadow-[0_24px_48px_-16px_rgb(0_0_0/0.45)] ring-[6px] ring-off-white"
                    />
                    <span
                      className="absolute top-[4%] left-[4%] grid size-[22%] place-items-center rounded-full bg-title-accent font-display text-[clamp(1.25rem,0.9rem+1.4vw,2rem)] font-bold text-banner-text"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Only announced when the visitor turns the wheel themselves. The inner block remounts on every step, so it hops in again. */}
      <div aria-live={turning ? "off" : "polite"} className="text-center">
        <div key={active} className="animate-flow-caption motion-reduce:animate-none">
          <p className="font-label text-xs font-bold tracking-[1.22px] text-light-green uppercase">
            {fill(m.step, { current: active + 1, total: images.length })}
          </p>
          <p className="font-display text-[clamp(1.5rem,1.1rem+1.2vw,2rem)] leading-tight font-medium text-title-accent">
            {m.steps[active].title}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {m.steps.map((step, index) => (
          <button
            key={step.title}
            type="button"
            onClick={() => goTo(index)}
            aria-label={fill(m.goTo, { number: index + 1, title: step.title })}
            aria-current={index === active ? "step" : undefined}
            className="group grid h-8 place-items-center px-1"
          >
            <span
              className={`block h-2.5 rounded-pill transition-all duration-300 ${
                index === active ? "w-7 bg-title-accent" : "w-2.5 bg-off-white/45 group-hover:bg-off-white/75"
              }`}
            />
          </button>
        ))}

      </div>
    </section>
  );
}
