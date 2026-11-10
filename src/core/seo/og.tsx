import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { OG_IMAGE_SIZE } from "@/data/seo";

/*
 * The preview images shown when a Palleys link is shared: the hero scene of the homepage with the logo, a line of copy
 * in the brand font (DynaPuff) and a photo. Rendered on request with next/og and cached by the route; the assets are
 * read once per server.
 */

const COLORS = { offWhite: "#f5f2e4", green: "#075847", yellow: "#ecbc46", lightGreen: "#a5cfb2" };

// The font file is the regular weight; a thin outline in the text colour gives headings the weight they have on the site.
const HEAVY = (color: string) => ({ WebkitTextStroke: `1.5px ${color}`, letterSpacing: -0.5 });

// Literal paths, so the build only ships these files with the route.
const FONT_PATH = path.join(process.cwd(), "src/assets/fonts/DynaPuff.ttf");
const SCENE_PATH = path.join(process.cwd(), "src/assets/og/scene.png");
const LOGO_PATH = path.join(process.cwd(), "public/images/footer/palleys-logo.svg");
const PHOTO_PATH = path.join(process.cwd(), "public/images/hero-flow/keychain.webp");
const dataUrl = (buffer: Buffer, type: string) => `data:${type};base64,${buffer.toString("base64")}`;

/** Satori reads PNG and JPEG, not WebP: everything goes through sharp first. */
export async function pngDataUrl(input: Buffer, width: number) {
  return dataUrl(await sharp(input).resize({ width, withoutEnlargement: true }).png().toBuffer(), "image/png");
}

let assets: Promise<{ font: Buffer; scene: string; logo: string }> | null = null;
function loadAssets() {
  assets ??= Promise.all([
    readFile(FONT_PATH),
    readFile(SCENE_PATH),
    readFile(LOGO_PATH),
  ]).then(([font, scene, logo]) => ({ font, scene: dataUrl(scene, "image/png"), logo: dataUrl(logo, "image/svg+xml") }));
  return assets;
}

function Pill({ children, background, color }: { children: string; background: string; color: string }) {
  return (
    <div style={{ display: "flex", alignSelf: "flex-start", padding: "10px 24px", borderRadius: 999, background, color, fontSize: 26 }}>
      {children}
    </div>
  );
}

async function render(content: React.ReactNode, scene: string, font: Buffer) {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", fontFamily: "DynaPuff", color: COLORS.offWhite }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={scene} width={OG_IMAGE_SIZE.width} height={OG_IMAGE_SIZE.height} alt="" style={{ position: "absolute", inset: 0 }} />
        {content}
      </div>
    ),
    { ...OG_IMAGE_SIZE, fonts: [{ name: "DynaPuff", data: font, style: "normal" }] },
  );
}

/** The site preview: logo, tagline and the keychain photo from the hero, as a round photo like the carousel. */
export async function siteOgImage({ tagline, badge }: { tagline: string; badge: string }) {
  const [{ font, scene, logo }, photo] = await Promise.all([
    loadAssets(),
    readFile(PHOTO_PATH).then((buffer) => pngDataUrl(buffer, 640)),
  ]);
  return render(
    <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", padding: "0 72px", gap: 56 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 34, width: 620 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={330} height={178} alt="" />
        {/* Words stay whole: "3D-geprinte" must not break after its hyphen. */}
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: 16, fontSize: 58, lineHeight: 1.08, ...HEAVY(COLORS.offWhite) }}>
          {tagline.split(" ").map((word, index) => (
            <span key={index} style={{ whiteSpace: "nowrap" }}>
              {word}
            </span>
          ))}
        </div>
        <Pill background={COLORS.yellow} color={COLORS.green}>
          {badge}
        </Pill>
      </div>
      <div
        style={{
          display: "flex",
          width: 400,
          height: 400,
          borderRadius: 999,
          border: `12px solid ${COLORS.offWhite}`,
          overflow: "hidden",
          boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} width={376} height={376} alt="" style={{ objectFit: "cover" }} />
      </div>
    </div>,
    scene,
    font,
  );
}

/** A product preview: the product on a light card, its name, price and where it's made. */
export async function productOgImage(input: { name: string; price: string; badge: string; line: string; image: Buffer | null }) {
  const [{ font, scene, logo }, photo] = await Promise.all([loadAssets(), input.image ? pngDataUrl(input.image, 900) : null]);
  return render(
    <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", padding: "0 64px", gap: 56 }}>
      <div
        style={{
          display: "flex",
          width: 470,
          height: 470,
          borderRadius: 40,
          background: COLORS.lightGreen,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={photo} width={410} height={410} alt="" style={{ objectFit: "contain" }} />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: 560 }}>
        <Pill background={COLORS.offWhite} color={COLORS.green}>
          {input.badge}
        </Pill>
        <div style={{ display: "flex", fontSize: 76, lineHeight: 1, color: COLORS.yellow, ...HEAVY(COLORS.yellow) }}>{input.name}</div>
        <div style={{ display: "flex", fontSize: 30, lineHeight: 1.25 }}>{input.line}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 8 }}>
          <Pill background={COLORS.yellow} color={COLORS.green}>
            {input.price}
          </Pill>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={150} height={81} alt="" />
        </div>
      </div>
    </div>,
    scene,
    font,
  );
}
