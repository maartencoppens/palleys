type PalleySizeProps = {
  /** "3,7 cm": the length of the base, front to back. */
  size: string;
  title: string;
  text: string;
};

/*
 * How big a Palley is: a lying pet with the measuring line along its base, which is its longest side (the x-axis), not
 * its height. No coin next to it on purpose: that made it look smaller than it is. Plain markup without hooks, so the
 * configurator (client) and the collectible page (server) share it.
 */
export default function PalleySize({ size, title, text }: PalleySizeProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[20px] bg-page p-4 sm:flex-row sm:items-center sm:gap-5 md:p-5">
      <svg className="h-[84px] w-[160px] shrink-0 md:h-[100px] md:w-[190px]" viewBox="0 0 160 84" fill="none" aria-hidden>
        <path
          className="fill-medium-green"
          d="M10 54C10 49 14 47 20 47H23C19 43 17 38 17 33 17 26 18 20 21 16L19 5 28 11C32 10 36 10 40 11L47 5 47 17C50 21 52 24 54 26 66 22 84 19 102 21 122 23 138 32 141 44 143 50 142 54 135 54Z"
        />
        {/* The tail along its side and the front leg, in the background colour. */}
        <path className="stroke-page" d="M138 50C128 44 112 44 99 50M23 47C31 46 40 48 45 54" strokeWidth="1.6" strokeLinecap="round" />
        <g className="stroke-medium-green" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 62v8M142 62v8M10 66h132" />
          <path d="M15 63 10 66l5 3M137 63l5 3-5 3" />
        </g>
        <rect className="fill-page" x="53" y="59" width="46" height="14" />
        <text x="76" y="66" textAnchor="middle" dominantBaseline="central" className="fill-medium-green font-label text-[11px] font-extrabold">
          {size}
        </text>
      </svg>
      <p className="text-base leading-[1.4] text-text-primary">
        <strong className="block font-label font-bold">{title}</strong>
        {text}
      </p>
    </div>
  );
}
