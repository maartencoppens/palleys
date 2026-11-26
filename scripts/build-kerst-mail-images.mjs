/*
 * Builds the images for the Christmas marketing mail (emails/kerst-palleys/kerst-palleys.html) from the Figma
 * exports in emails/kerst-palleys/bron. Mail clients (Gmail, Outlook) don't show SVG or absolutely positioned
 * layers, so each layered band is flattened into one PNG at 2x on the brand green.
 *
 *   node scripts/build-kerst-mail-images.mjs
 *
 * Output lands in public/images/email/kerst so it is served from https://www.palleys.be/images/email/kerst/.
 */
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const SCALE = 2;
const GREEN = "#075847";
const root = path.resolve(import.meta.dirname, "..");
const src = (file) => path.join(root, "emails/kerst-palleys/bron", file);
const out = (file) => path.join(root, "public/images/email/kerst", file);

/** An SVG rasterised at SCALE to exactly width × height (in design px). */
async function svg(file, width, height) {
  const buffer = await readFile(src(file));
  return sharp(buffer, { density: 72 * SCALE * 2 })
    .resize(Math.round(width * SCALE), Math.round(height * SCALE), { fit: "fill" })
    .png()
    .toBuffer();
}

/** A green band of width × height with layers placed at their Figma positions. */
async function band(file, width, height, layers) {
  const composite = await Promise.all(
    layers.map(async ({ file: layer, left, top, width: w, height: h }) => ({
      input: await svg(layer, w, h),
      left: Math.round(left * SCALE),
      top: Math.round(top * SCALE),
    })),
  );
  await sharp({ create: { width: width * SCALE, height: height * SCALE, channels: 4, background: GREEN } })
    .composite(composite)
    .flatten({ background: GREEN })
    .png({ compressionLevel: 9, palette: true, quality: 95 })
    .toFile(out(file));
}

await mkdir(out(""), { recursive: true });

// Header 600 × 150: fairy lights (top −4, clipped by the frame) and the logo centred.
await band("header.png", 600, 150, [
  { file: "lichtjes.svg", left: 0, top: -4, width: 600, height: 76 },
  { file: "logo.svg", left: 230, top: 52.68, width: 140, height: 75.32 },
]);

// Snow band 600 × 120: snow hills, three presents and the tree.
await band("sneeuw.png", 600, 120, [
  { file: "sneeuw.svg", left: 0, top: 72.16, width: 600, height: 47.84 },
  { file: "cadeau-1.svg", left: 40, top: 72, width: 44, height: 49.5 },
  { file: "cadeau-2.svg", left: 88, top: 62, width: 54, height: 60.75 },
  { file: "cadeau-3.svg", left: 146, top: 78, width: 38, height: 42.75 },
  { file: "kerstboom.svg", left: 477, top: 4, width: 77, height: 110 },
]);

// Photo in its blob, 580 × 460 including the shadow. In Figma the shadow overflows 22px above and 50px below
// the 508 × 388 blob and the 14px gaps overlap it; mail can't overlap, so trim what the gaps would cover.
const TRIM_TOP = 22 - 14;
const TRIM_BOTTOM = 50 - 14;
await sharp(src("foto-blob.png"))
  .resize(580 * SCALE, 460 * SCALE, { fit: "fill" })
  .flatten({ background: GREEN })
  .extract({ left: 0, top: TRIM_TOP * SCALE, width: 580 * SCALE, height: (460 - TRIM_TOP - TRIM_BOTTOM) * SCALE })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(out("foto.jpg"));

console.log("Mail images written to public/images/email/kerst");
