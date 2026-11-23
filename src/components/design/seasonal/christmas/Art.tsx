/*
 * Christmas artwork, drawn in the flat style of the hero illustration: two tones per shape, no gradients, and only the
 * brand palette plus the greens and bark of hero-background.svg. Decorative only (aria-hidden); size and position
 * come from the className. The Figma originals are on page "01 — Kerst moodboard" of "Palleys — Kersteditie".
 */

type ArtProps = { className?: string };

export function SantaHat({ className }: ArtProps) {
  return (
    <svg className={className} viewBox="0 0 142 96" fill="none" aria-hidden>
      <path d="M18 76C20 46 40 20 72 14C98 9 118 22 124 46C125 52 124 58 121 62C116 54 108 50 99 51C101 60 103 68 104 76Z" fill="#C2521F" />
      <path d="M18 76C20 46 40 20 72 14C82 12 90 12 97 14C70 22 52 44 46 76Z" fill="#EF7550" />
      <path
        d="M17 68Q22.4 63 27.8 68Q33.1 63 38.5 68Q43.9 63 49.2 68Q54.6 63 60 68Q65.4 63 70.8 68Q76.1 63 81.5 68Q86.9 63 92.2 68Q97.6 63 103 68A11 11 0 0 1 103 90Q97.6 95 92.2 90Q86.9 95 81.5 90Q76.1 95 70.8 90Q65.4 95 60 90Q54.6 95 49.2 90Q43.9 95 38.5 90Q33.1 95 27.8 90Q22.4 95 17 90A11 11 0 0 1 17 68Z"
        fill="#F5F2E4"
      />
      <path d="M16 84Q40 89 62 87Q86 85 106 87" stroke="#EBE9DF" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M136 64Q138 69.1 133.2 71.7Q131.4 76.9 126.1 75.8Q121.4 78.7 118 74.4Q112.6 73.6 112.7 68.1Q109.1 64 112.7 59.9Q112.6 54.4 118 53.6Q121.4 49.3 126.1 52.2Q131.4 51.1 133.2 56.3Q138 58.9 136 64Z"
        fill="#F5F2E4"
      />
      <path d="M118 70Q124 74 130 69" stroke="#EBE9DF" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Star({ className }: ArtProps) {
  return (
    <svg className={className} viewBox="0 0 44 44" fill="none" aria-hidden>
      <path d="M22 5L27 16.1L39.1 17.4L30.1 25.6L32.6 37.6L22 31.5L11.4 37.6L13.9 25.6L4.9 17.4L17 16.1Z" fill="#ECBC46" stroke="#ECBC46" strokeWidth="4" strokeLinejoin="round" />
      <path d="M22 14L24.6 19.4L30.6 20.2L26.3 24.4L27.3 30.3L22 27.5L16.7 30.3L17.7 24.4L13.4 20.2L19.4 19.4Z" fill="#FFC543" />
    </svg>
  );
}

export function Snowflake({ className }: ArtProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden>
      <path
        d="M20 20L20 4M20 11.2L16.5 7.7M20 11.2L23.5 7.7M20 20L33.9 12M27.6 15.6L28.9 10.8M27.6 15.6L32.5 16.9M20 20L33.9 28M27.6 24.4L32.5 23.1M27.6 24.4L28.9 29.2M20 20L20 36M20 28.8L23.5 32.3M20 28.8L16.5 32.3M20 20L6.1 28M12.4 24.4L11.1 29.2M12.4 24.4L7.5 23.1M20 20L6.1 12M12.4 15.6L7.5 16.9M12.4 15.6L11.1 10.8"
        stroke="#F5F2E4"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="3" fill="#F5F2E4" />
    </svg>
  );
}

const ORNAMENTS = {
  red: { body: "#EF7550", pattern: <path d="M3 45C15 39 22 53 30 47C38 41 45 55 57 49V57C45 63 38 49 30 55C22 61 15 47 3 53Z" fill="#F6D66B" /> },
  teal: {
    body: "#16A39A",
    pattern: (
      <g fill="#F5F2E4">
        {[[16, 40], [30, 34], [44, 40], [22, 56], [38, 56], [30, 70]].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" />
        ))}
      </g>
    ),
  },
  // The paw from the logo, so the brand hangs in the tree too.
  paw: {
    body: "#ECBC46",
    pattern: (
      <g fill="#075847">
        <ellipse cx="30" cy="56" rx="9" ry="7" />
        <circle cx="19" cy="45" r="3.8" />
        <circle cx="26" cy="40" r="4" />
        <circle cx="34" cy="40" r="4" />
        <circle cx="41" cy="45" r="3.8" />
      </g>
    ),
  },
} as const;

export type OrnamentVariant = keyof typeof ORNAMENTS;

/** A bauble with its cap and the start of its string; hang it from a line drawn above it. */
export function Ornament({ className, variant = "red" }: ArtProps & { variant?: OrnamentVariant }) {
  const ornament = ORNAMENTS[variant];
  return (
    <svg className={className} viewBox="0 0 60 82" fill="none" aria-hidden>
      <path d="M30 0V12" stroke="#075847" strokeWidth="2" />
      <rect x="22" y="11" width="16" height="11" rx="3" fill="#ECBC46" />
      <path d="M24 14H36" stroke="#F6D66B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="51" r="28" fill={ornament.body} />
      {ornament.pattern}
      <path d="M14 36C17 31 21 28 26 27" stroke="#F5F2E4" strokeOpacity="0.7" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

const GIFTS = {
  red: { body: "#EF7550", ribbon: "#F6D66B" },
  teal: { body: "#16A39A", ribbon: "#F5F2E4" },
  yellow: { body: "#F6D66B", ribbon: "#EF7550" },
} as const;

export type GiftVariant = keyof typeof GIFTS;

export function Gift({ className, variant = "red" }: ArtProps & { variant?: GiftVariant }) {
  const { body, ribbon } = GIFTS[variant];
  return (
    <svg className={className} viewBox="0 0 80 90" fill="none" aria-hidden>
      <rect x="4" y="26" width="72" height="64" rx="6" fill={body} />
      <rect y="16" width="80" height="16" rx="5" fill={body} />
      <rect y="16" width="80" height="16" rx="5" fill="black" fillOpacity="0.08" />
      <rect x="34" y="16" width="12" height="74" fill={ribbon} />
      <path d="M40 17C34 4 16 2 18 12C19 18 32 18 40 17Z" fill={ribbon} />
      <path d="M40 17C46 4 64 2 62 12C61 18 48 18 40 17Z" fill={ribbon} />
      <circle cx="40" cy="17" r="5" fill={ribbon} />
    </svg>
  );
}

/* Four tiers, each a light left half and a darker right half, with a garland of lights and baubles. */
export function ChristmasTree({ className }: ArtProps) {
  const garlands = [
    { d: "M140 200Q215 248 290 240", bulbs: [[155, 215, "#F6D66B"], [185, 230, "#EF7550"], [215, 240, "#F5F2E4"], [245, 246, "#16A39A"], [275, 247, "#F6D66B"]] },
    { d: "M320 330Q200 383 80 380", bulbs: [[296, 346, "#EF7550"], [248, 363, "#F5F2E4"], [200, 375, "#16A39A"], [152, 383, "#F6D66B"], [104, 386, "#EF7550"]] },
    { d: "M60 470Q218 520 375 515", bulbs: [[92, 486, "#F5F2E4"], [154, 501, "#16A39A"], [218, 512, "#F6D66B"], [280, 519, "#EF7550"], [344, 522, "#F5F2E4"]] },
  ] as const;
  const baubles = [
    [170, 300, 12, "#EF7550"], [270, 420, 13, "#16A39A"], [120, 440, 12, "#F6D66B"], [240, 170, 10, "#EF7550"],
    [330, 520, 12, "#EF7550"], [90, 545, 12, "#16A39A"], [215, 520, 11, "#F6D66B"],
  ] as const;
  return (
    <svg className={className} viewBox="0 0 420 600" fill="none" aria-hidden>
      <path d="M188 530H232V590C232 596 228 600 222 600H198C192 600 188 596 188 590Z" fill="#AC714D" />
      <path d="M210 360C136 420 38 488 5 530Q46 557 87 530Q128 557 169 530Q210 557 251 530Q292 557 333 530Q374 557 415 530C382 488 284 420 210 360Z" fill="#20735F" />
      <path d="M210 360C284 420 382 488 415 530Q374 557 333 530Q292 557 251 530Q230 557 210 530L210 360Z" fill="#075847" />
      <path d="M210 250C147 313 63 385 35 430Q70 459 105 430Q140 459 175 430Q210 459 245 430Q280 459 315 430Q350 459 385 430C357 385 273 313 210 250Z" fill="#51784C" />
      <path d="M210 250C273 313 357 385 385 430Q350 459 315 430Q280 459 245 430Q228 459 210 430L210 250Z" fill="#20735F" />
      <path d="M210 150C163 210 101 278 80 320Q106 347 132 320Q158 347 184 320Q210 347 236 320Q262 347 288 320Q314 347 340 320C319 278 257 210 210 150Z" fill="#579863" />
      <path d="M210 150C257 210 319 278 340 320Q314 347 288 320Q262 347 236 320Q223 347 210 320L210 150Z" fill="#51784C" />
      <path d="M210 70C179 122 139 182 125 220Q142 244 159 220Q176 244 193 220Q210 244 227 220Q244 244 261 220Q278 244 295 220C281 182 241 122 210 70Z" fill="#83A55C" />
      <path d="M210 70C241 122 281 182 295 220Q278 244 261 220Q244 244 227 220Q218 244 210 220L210 70Z" fill="#579863" />
      {garlands.map((garland) => (
        <g key={garland.d}>
          <path d={garland.d} stroke="#ECBC46" strokeWidth="3" strokeLinecap="round" />
          {garland.bulbs.map(([cx, cy, fill]) => (
            <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="4" ry="6" fill={fill} />
          ))}
        </g>
      ))}
      {baubles.map(([cx, cy, r, fill]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={r} fill={fill} />
          <rect x={cx - 4} y={cy - r - 4} width="7" height="5" rx="2" fill="#ECBC46" />
        </g>
      ))}
      <circle cx="210" cy="56" r="44" fill="#FFC543" fillOpacity="0.2" />
      <path d="M210 24L219 46L242 48L224 63L230 86L210 73L190 86L196 63L178 48L201 46Z" fill="#ECBC46" stroke="#ECBC46" strokeWidth="6" strokeLinejoin="round" />
      <path d="M210 42L215 52L225 53L218 60L219 71L210 66L201 71L202 60L195 53L205 52Z" fill="#FFC543" />
    </svg>
  );
}

/** Rolling snow along the bottom of a scene; stretches to any width. */
export function SnowHills({ className }: ArtProps) {
  return (
    <svg className={className} viewBox="0 0 1440 120" preserveAspectRatio="none" fill="none" aria-hidden>
      <path d="M0 60C120 30 260 34 380 58C520 86 640 40 780 44C920 48 1000 82 1140 70C1260 60 1350 30 1440 40V120H0Z" fill="#EBE9DF" />
      <path d="M0 80C160 56 300 60 440 82C580 104 700 70 860 72C1020 74 1120 100 1260 92C1340 88 1400 76 1440 72V120H0Z" fill="#F5F2E4" />
    </svg>
  );
}

/** Snow lying on a top edge: wide, rounded overhang with a shadow rim. Stretches to any width. */
export function SnowEdge({ className }: ArtProps) {
  const d =
    "M0 0H864V16C851.1 35.4 791 35.4 778.1 16.8C763.2 37.7 693.3 37.7 678.3 14.1C666.9 24.6 613.8 24.6 602.5 17.6C594.5 29.5 557.2 29.5 549.2 15.5C541.4 22.1 504.6 22.1 496.7 14.9C487.1 26.6 442.4 26.6 432.8 17.2C424.6 31.8 386.2 31.8 377.9 14.5C361.7 20.8 285.9 20.8 269.7 14.9C253.4 23.2 177.2 23.2 160.8 17.8C148.8 36.5 92.4 36.5 80.3 14.7C64.1 25.9 16.2 25.9 0 17.6Z";
  return (
    <svg className={className} viewBox="0 0 864 56" preserveAspectRatio="none" fill="none" aria-hidden>
      <path d={d} fill="#EBE9DF" transform="translate(0 4)" />
      <path d={d} fill="#F5F2E4" />
    </svg>
  );
}

// One 600px span of lights: a wire in four sagging loops with twelve bulbs, each with a soft glow.
const LIGHT_COLOURS = ["#F6D66B", "#EF7550", "#A5CFB2", "#16A39A"];
const WIRE_PATH = "M0 8Q75 76 150 8Q225 76 300 8Q375 76 450 8Q525 76 600 8";
const BULBS = [0, 1, 2, 3].flatMap((loop) =>
  [0.2, 0.5, 0.8].map((t) => {
    const x = loop * 150 + 150 * t;
    const y = (1 - t) ** 2 * 8 + 2 * (1 - t) * t * 76 + t * t * 8;
    const slope = Math.atan2(2 * (1 - t) * 68 - 2 * t * 68, 150);
    return { x, y, angle: (slope * 180 * 0.6) / Math.PI };
  }),
);

/**
 * A string of lights that hangs from its top edge. "light" has a dark green wire for light backgrounds, "dark" a mint
 * wire that stays visible on green. Repeat it side by side for longer runs.
 */
export function StringLights({ className, wire = "light" }: ArtProps & { wire?: "light" | "dark" }) {
  const wireColour = wire === "light" ? "#075847" : "#A5CFB2";
  return (
    <svg className={className} viewBox="0 0 600 76" fill="none" aria-hidden>
      <path d={WIRE_PATH} stroke={wireColour} strokeWidth="2.5" strokeLinecap="round" />
      {BULBS.map((bulb, index) => {
        const colour = LIGHT_COLOURS[index % LIGHT_COLOURS.length];
        return (
          <g key={index} transform={`translate(${bulb.x.toFixed(1)} ${bulb.y.toFixed(1)}) rotate(${bulb.angle.toFixed(1)})`}>
            <circle cy="17" r="13" fill={colour} fillOpacity="0.25" />
            <rect x="-4" y="-1" width="8" height="8" rx="1.5" fill={wireColour} />
            <path d="M-6 9C-8 14 -7 22 0 27C7 22 8 14 6 9Z" fill={colour} />
            <path d="M-3 12C-4 15 -4 18 -2 21" stroke="white" strokeOpacity="0.6" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
}

/** Paw prints in the snow, walking to the right; the paw is the one from the logo. */
export function PawTrail({ className }: ArtProps) {
  return (
    <svg className={className} viewBox="0 0 320 64" fill="#A5CFB2" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((step) => (
        <g key={step} transform={`translate(${20 + step * 52} ${34 + (step % 2 ? 10 : -10) - step * 2}) rotate(90) scale(0.8)`}>
          <path d="M0 4C-9 4 -13 11 -12 16C-11 21 -5 21 0 19C5 21 11 21 12 16C13 11 9 4 0 4Z" />
          <ellipse cx="-11" cy="-4" rx="3.6" ry="4.8" transform="rotate(-20 -11 -4)" />
          <ellipse cx="-4" cy="-10" rx="3.8" ry="5.2" transform="rotate(-6 -4 -10)" />
          <ellipse cx="4" cy="-10" rx="3.8" ry="5.2" transform="rotate(6 4 -10)" />
          <ellipse cx="11" cy="-4" rx="3.6" ry="4.8" transform="rotate(20 11 -4)" />
        </g>
      ))}
    </svg>
  );
}

// Fixed, scattered positions (percent of the scene), so the server and the browser draw the same snow.
const FLAKES = Array.from({ length: 42 }, (_, index) => {
  const seed = (index * 9301 + 49297) % 233280;
  const random = (offset: number) => ((seed * (offset + 1) * 16807) % 2147483647) / 2147483647;
  return {
    left: `${(random(1) * 100).toFixed(2)}%`,
    top: `${(random(2) * 100).toFixed(2)}%`,
    size: [3, 4, 5, 6, 8][Math.floor(random(3) * 5)],
    opacity: [0.35, 0.5, 0.7, 0.9][Math.floor(random(4) * 4)],
    delay: `${(random(5) * -9).toFixed(2)}s`,
  };
});

/** Soft snow over a scene. The flakes drift gently and hold still for visitors who prefer reduced motion. */
export function Snowfall({ className }: ArtProps) {
  return (
    <div className={className} aria-hidden>
      {FLAKES.map((flake, index) => (
        <span
          key={index}
          className="absolute animate-snow-drift rounded-full bg-off-white motion-reduce:animate-none"
          style={{ left: flake.left, top: flake.top, width: flake.size, height: flake.size, opacity: flake.opacity, animationDelay: flake.delay }}
        />
      ))}
    </div>
  );
}
