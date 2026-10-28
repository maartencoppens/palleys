import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/*
 * The hero scene (shapes, leaves, flowers, teal banner), exported from Figma as one 1440×780 SVG.
 * It's inlined rather than used as an <img>, so the individual leaves and flowers can sway (see
 * SiteAnimations, data-sway). Read on the server at build time, so it costs no client JavaScript.
 *
 * `xMinYMax slice` makes it behave like object-fit: cover pinned to the bottom-left, so the foliage
 * stays on the bottom edge on every screen.
 */
const heroAssetPath = path.join(process.cwd(), "public/images/hero-background.svg");
const fallbackSvg = `
  <svg width="1440" height="780" viewBox="0 0 1440 780" xmlns="http://www.w3.org/2000/svg">
    <rect width="1440" height="780" fill="#16A39A"/>
    <path d="M0 620C190 535 290 650 455 590C640 522 746 602 900 550C1088 487 1240 570 1440 490V780H0V620Z" fill="#0B7774"/>
    <path d="M0 700C180 625 338 720 510 668C696 612 795 704 982 632C1160 564 1292 650 1440 590V780H0V700Z" fill="#075A5D"/>
    <circle cx="180" cy="570" r="52" fill="#F5C45B"/>
    <circle cx="1190" cy="535" r="68" fill="#EF8D73"/>
  </svg>
`;

const source = existsSync(heroAssetPath)
  ? readFileSync(heroAssetPath, "utf8")
  : (console.warn(`Hero artwork not found at ${heroAssetPath}; using the fallback artwork.`), fallbackSvg);

const svg = source.replace(
  '<svg width="1440" height="780"',
  '<svg width="100%" height="100%" preserveAspectRatio="xMinYMax slice" aria-hidden="true" focusable="false"',
);

export default function HeroArt() {
  return (
    <div
      data-hero-art
      data-sway="scene"
      className="pointer-events-none absolute inset-0 z-0 select-none [&>svg]:block"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
