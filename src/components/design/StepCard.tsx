import Image from "next/image";

type Asset = { src: string; width: number; height: number };

/** Icon artwork plus its top-left offset inside the 270px artwork slot, taken from Figma. */
type Icon = Asset & { x: number; y: number };

export type Step = {
  title: string;
  description: string;
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

        <span
          data-animate="wiggle"
          className="absolute -top-[18px] left-[13px] grid size-[60px] place-items-center rounded-full bg-medium-green text-[32px] font-bold text-white"
          aria-hidden
        >
          {number}
        </span>
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
