import { unzipSync } from "fflate";
import { z } from "zod";

/*
 * What's in a print zip (OBJ + MTL + texture), read without rendering it: the size of the model, its triangles and the
 * texture's resolution. Shown next to every model on Processed and on a collectible's model versions, to check at a
 * glance that the right file went up (not the unscaled or decimated one). Pure, no I/O: the bytes come from R2.
 */

export const modelMetaSchema = z.object({
  /** Size along x, y and z in the OBJ's own units (as Blender exported them; JLC asks which unit on upload). */
  dimensions: z.tuple([z.number(), z.number(), z.number()]),
  triangles: z.number().int().min(0),
  vertices: z.number().int().min(0),
  texture: z.object({ width: z.number().int(), height: z.number().int(), bytes: z.number().int(), format: z.enum(["png", "jpg"]) }).nullable(),
  /** Size of the zip as uploaded. */
  zipBytes: z.number().int().min(0),
});

export type ModelMeta = z.infer<typeof modelMetaSchema>;

export class ModelMetaError extends Error {}

const baseName = (path: string) => path.split("/").pop() ?? path;
const isJunk = (path: string) => path.startsWith("__MACOSX/") || baseName(path).startsWith("._") || path.endsWith("/");
const extensionOf = (path: string) => baseName(path).split(".").pop()?.toLowerCase() ?? "";

/** A stored meta as it's read back; anything that doesn't fit counts as unknown. */
export function parseModelMeta(value: unknown): ModelMeta | null {
  const parsed = modelMetaSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

const SPACE = 32;
const TAB = 9;
const NEWLINE = 10;
const RETURN = 13;
const isBlank = (byte: number) => byte === SPACE || byte === TAB || byte === RETURN;

/** Vertices, triangles (an n-gon counts as n − 2) and the bounding box of an OBJ, straight from its bytes. */
export function objStats(bytes: Uint8Array) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let vertices = 0;
  let triangles = 0;
  const length = bytes.length;
  let i = 0;
  while (i < length) {
    while (i < length && (bytes[i] === SPACE || bytes[i] === TAB)) i++;
    let end = i;
    while (end < length && bytes[end] !== NEWLINE) end++;
    const first = bytes[i];
    const second = bytes[i + 1];
    if (first === 118 /* v */ && (second === SPACE || second === TAB)) {
      // "v x y z [w]": the line is short, decoding just this slice is cheap.
      const parts = String.fromCharCode(...bytes.subarray(i + 2, end)).trim().split(/\s+/);
      if (parts.length >= 3) {
        vertices++;
        for (let axis = 0; axis < 3; axis++) {
          const value = Number(parts[axis]);
          if (Number.isFinite(value)) {
            if (value < min[axis]) min[axis] = value;
            if (value > max[axis]) max[axis] = value;
          }
        }
      }
    } else if (first === 102 /* f */ && (second === SPACE || second === TAB)) {
      let corners = 0;
      let inToken = false;
      for (let j = i + 1; j < end; j++) {
        const blank = isBlank(bytes[j]);
        if (!blank && !inToken) corners++;
        inToken = !blank;
      }
      if (corners >= 3) triangles += corners - 2;
    }
    i = end + 1;
  }
  const dimensions = vertices > 0 ? ([0, 1, 2].map((axis) => max[axis] - min[axis]) as [number, number, number]) : ([0, 0, 0] as [number, number, number]);
  return { vertices, triangles, dimensions };
}

/** Width and height of a PNG (IHDR) or a JPEG (first SOF marker), without decoding the image. */
export function imageSize(bytes: Uint8Array): { width: number; height: number; format: "png" | "jpg" } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { width: view.getUint32(16), height: view.getUint32(20), format: "png" };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      if (marker === 0xff) {
        offset++;
        continue;
      }
      const segment = view.getUint16(offset + 2);
      // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7), format: "jpg" };
      }
      offset += 2 + segment;
    }
  }
  return null;
}

/** The texture the MTL points at (map_Kd), else the only image in the zip. */
function textureOf(files: Record<string, Uint8Array>, mtl: Uint8Array | null) {
  const images = Object.keys(files).filter((path) => ["png", "jpg", "jpeg"].includes(extensionOf(path)));
  const wanted = mtl ? new TextDecoder().decode(mtl).match(/^\s*map_Kd\s+(.+?)\s*$/m)?.[1] : null;
  const wantedName = wanted ? baseName(wanted.replace(/\\/g, "/")) : null;
  const path = images.find((image) => wantedName && baseName(image) === wantedName) ?? (images.length === 1 ? images[0] : images[0] ?? null);
  return path ? files[path] : null;
}

/** Reads a print zip. Throws ModelMetaError when there's no OBJ in it. */
export function readModelMeta(zip: Uint8Array): ModelMeta {
  let files: Record<string, Uint8Array>;
  try {
    // Only what we read: a GLB or other extras can be large and are left compressed.
    files = unzipSync(zip, { filter: (file) => !isJunk(file.name) && ["obj", "mtl", "png", "jpg", "jpeg"].includes(extensionOf(file.name)) });
  } catch {
    throw new ModelMetaError("Dit bestand is geen geldige zip");
  }
  const objPath = Object.keys(files).find((path) => extensionOf(path) === "obj");
  if (!objPath) throw new ModelMetaError("De zip bevat geen OBJ-bestand");
  const mtlPath = Object.keys(files).find((path) => extensionOf(path) === "mtl");
  const stats = objStats(files[objPath]);
  const texture = textureOf(files, mtlPath ? files[mtlPath] : null);
  const size = texture ? imageSize(texture) : null;
  return {
    dimensions: stats.dimensions.map((value) => Math.round(value * 100) / 100) as [number, number, number],
    triangles: stats.triangles,
    vertices: stats.vertices,
    texture: texture && size ? { ...size, bytes: texture.length } : null,
    zipBytes: zip.length,
  };
}

const integer = new Intl.NumberFormat("nl-BE");
const decimal = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 2 });

/** "1,2 MB" */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${decimal.format(bytes / 1024)} kB`;
  return `${decimal.format(bytes / 1024 / 1024)} MB`;
}

/** The three lines the backoffice shows: "3,2 × 2,5 × 4,1 eenheden", "48.210 triangles", "2048 × 2048 PNG · 3,1 MB". */
export function describeModelMeta(meta: ModelMeta) {
  return {
    dimensions: `${meta.dimensions.map((value) => decimal.format(value)).join(" × ")} eenheden`,
    triangles: `${integer.format(meta.triangles)} triangles`,
    texture: meta.texture
      ? `${meta.texture.width} × ${meta.texture.height} ${meta.texture.format.toUpperCase()} · ${formatBytes(meta.texture.bytes)}`
      : "Geen textuur gevonden",
  };
}
