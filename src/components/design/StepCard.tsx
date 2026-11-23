import type { ReactNode } from "react";
import Image from "next/image";

type Asset = { src: string; width: number; height: number };

/** Icon artwork plus its top-left offset inside the 270px artwork slot, taken from Figma. */
type Icon = Asset & { x: number; y: number };

export type Step = {
  title: string;
  description: ReactNode;
  /** Coloured organic shape behind the icon; each step has its own. */
  blob: Asset;
  icon: Icon;
};

type StepCardProps = Step & {
  number: number;
  className?: string;
};

export default function StepCard({ number, title, description, blob, icon, className = "" }: StepCardProps) {
  return (
    <li
      className={`flex w-full max-w-[447px] items-center gap-5 text-left md:flex-col md:gap-3.5 md:text-center ${className}`}
    >
      {/*
       * Fixed 270px artwork slot, so titles line up even though the blobs differ in height.
       * `zoom` shrinks the whole artwork (blob, icon, badge) on smaller screens while keeping it in proportion.
       */}
      <div className="relative size-[270px] shrink-0 [zoom:0.5] md:[zoom:0.75] lg:[zoom:1]">
        {/* Blobs are ~273px wide and overhang the slot slightly, as in Figma. */}
        <Image className="max-w-none" src={blob.src} width={blob.width} height={blob.height} alt="" />
        <Image
          className="absolute"
          style={{ left: icon.x, top: icon.y }}
          src={icon.src}
          width={icon.width}
          height={icon.height}
          alt=""
        />

        {/*
         * SVG instead of text in a blob: the number scales with the artwork's zoom as one shape, so a
         * browser's minimum font size or text autosizing on phones can't push it out of the badge.
         * The badge is the brand blob (blob-1), scaled from its 273×267 artwork into the 60px box.
         */}
        <svg
          data-animate="wiggle"
          className="absolute -top-[18px] left-[13px] size-[60px]"
          viewBox="0 0 60 60"
          aria-hidden
        >
          <path
            d="M273 121.5C273 204.343 218.843 267 136 267C53.1573 267 0 226.343 0 143.5C0 60.6573 22.1573 0 105 0C187.843 0 273 38.6573 273 121.5Z"
            transform="scale(0.2198 0.2247)"
            className="fill-medium-green"
          />
          <text
            x="30"
            y="30"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-white text-[32px] font-bold"
          >
            {number}
          </text>
        </svg>
      </div>

      <div className="flex flex-col gap-1.5 md:items-center md:gap-3.5">
        <h3 className="font-display text-[22px] leading-[1.2] font-bold text-medium-green md:text-[26px] lg:text-[32px]">
          <span className="sr-only">Stap {number}: </span>
          {title}
        </h3>
        <p className="text-base leading-[1.36] text-text-muted md:text-lg lg:text-2xl">{description}</p>
      </div>
    </li>
  );
}
