import { unzipSync } from "fflate";

/*
 * Reads a 3D model an admin made themselves (in Blender, on Meshy's website, ...), uploaded as one zip: the same files
 * Meshy gives us, so everything after it (review, Goedgekeurd, Blender, batches) works the same. Pure, no I/O.
 *
 *   required  one .obj, one .mtl and the texture (.png or .jpg) the .mtl points to (map_Kd)
 *   optional  a .glb for the 3D viewer; without it the viewer shows the OBJ with its texture
 */

export class InvalidModelZipError extends Error {}

export type ModelZipContents = {
  obj: Uint8Array;
  mtl: Uint8Array;
  texture: { bytes: Uint8Array; extension: "png" | "jpg" };
  glb: Uint8Array | null;
};

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"] as const;

const baseName = (path: string) => path.split("/").pop() ?? path;
const extensionOf = (path: string) => baseName(path).split(".").pop()?.toLowerCase() ?? "";

/** macOS adds __MACOSX/ and ._ files to a zip made in the Finder: never part of the model. */
const isJunk = (path: string) => path.startsWith("__MACOSX/") || baseName(path).startsWith("._") || path.endsWith("/");

function unzip(bytes: Uint8Array) {
  try {
    return unzipSync(bytes);
  } catch {
    throw new InvalidModelZipError("Dit bestand is geen geldige zip");
  }
}

/** The one file with this extension. More than one is ambiguous: refused rather than guessed. */
function single(paths: string[], extension: string, label: string, preferred?: string | null) {
  const matches = paths.filter((path) => extensionOf(path) === extension);
  if (matches.length === 0) throw new InvalidModelZipError(`De zip bevat geen ${label}`);
  if (matches.length === 1) return matches[0];
  const byName = preferred && matches.find((path) => baseName(path) === preferred);
  if (byName) return byName;
  throw new InvalidModelZipError(`De zip bevat meer dan één ${label}: laat er één over`);
}

/** The file named after a line like `mtllib model.mtl` or `map_Kd texture.png`, without its folder. */
function referencedFile(text: string, keyword: string) {
  const match = text.match(new RegExp(`^\\s*${keyword}\\s+(.+?)\\s*$`, "m"));
  return match ? baseName(match[1].replace(/\\/g, "/")) : null;
}

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

export function readModelZip(bytes: Uint8Array): ModelZipContents {
  const files = unzip(bytes);
  const paths = Object.keys(files).filter((path) => !isJunk(path));

  const objPath = single(paths, "obj", "OBJ-bestand");
  const obj = files[objPath];
  const mtlPath = single(paths, "mtl", "MTL-bestand", referencedFile(decode(obj), "mtllib"));
  const mtl = files[mtlPath];

  const images = paths.filter((path) => (IMAGE_EXTENSIONS as readonly string[]).includes(extensionOf(path)));
  const wanted = referencedFile(decode(mtl), "map_Kd");
  const texturePath = images.find((path) => wanted && baseName(path) === wanted) ?? (images.length === 1 ? images[0] : null);
  if (!texturePath) {
    throw new InvalidModelZipError(
      images.length === 0
        ? "De zip bevat geen textuur (.png of .jpg)"
        : `Welke afbeelding is de textuur? Het MTL-bestand verwijst naar ${wanted ?? "geen enkele"}`,
    );
  }

  const glbs = paths.filter((path) => extensionOf(path) === "glb");
  if (glbs.length > 1) throw new InvalidModelZipError("De zip bevat meer dan één GLB-bestand: laat er één over");

  return {
    obj,
    mtl,
    texture: { bytes: files[texturePath], extension: extensionOf(texturePath) === "png" ? "png" : "jpg" },
    glb: glbs.length === 1 ? files[glbs[0]] : null,
  };
}
