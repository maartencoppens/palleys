import { UNPAID_UPLOAD_TTL_MS } from "@/data/retention";
import { IMAGE_EXTENSIONS } from "@/data/uploads";
import { DOWNLOAD_NAME_PREFIX, PREVIEW_KEY_PREFIX } from "@/data/storage";

const MIME_BY_EXT: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(IMAGE_EXTENSIONS).map(([mime, ext]) => [ext, mime]),
  ),
  jpeg: "image/jpeg",
};

export function extensionForMime(mimeType: string) {
  return IMAGE_EXTENSIONS[mimeType as keyof typeof IMAGE_EXTENSIONS] ?? "bin";
}

function previewFolder(previewId: string) {
  return `${PREVIEW_KEY_PREFIX}/${previewId}`;
}

export function originalPhotoKey(previewId: string, mimeType: string) {
  return `${previewFolder(previewId)}/original.${extensionForMime(mimeType)}`;
}

export function poseImageKey(previewId: string, mimeType: string) {
  return `${previewFolder(previewId)}/pose-${Date.now()}.${extensionForMime(mimeType)}`;
}

export function unpaidExpiry(from: number = Date.now()) {
  return new Date(from + UNPAID_UPLOAD_TTL_MS);
}

export function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message.slice(0, 500) : "Unknown error";
}

export function mimeTypeForKey(key: string) {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME_BY_EXT[ext];
  if (!mime) throw new Error(`Unsupported image type: .${ext}`);
  return mime;
}

// Keys per Meshy-taak, niet per tijdstip: wordt dezelfde taak twee keer
// verwerkt (webhook + knop), dan overschrijft de tweede gewoon de eerste.
export function modelKeys(previewId: string, taskId: string) {
  const base = `${previewFolder(previewId)}/model-${taskId}`;
  return {
    glbKey: `${base}.glb`,
    objKey: `${base}.obj`,
    mtlKey: `${base}.mtl`,
    textureKey: `${base}.png`,
  };
}

// De naam waaronder OBJ, MTL en PNG gedownload worden. Moet dezelfde zijn
// als in linkPrintFiles, anders vindt de slicer de textuur niet.
export function printFileBaseName(previewId: string) {
  return `${DOWNLOAD_NAME_PREFIX}-${previewId.slice(0, 8)}`;
}

// Een OBJ verwijst via `mtllib` naar zijn MTL, en de MTL via `map_Kd` naar
// de PNG. Dat gaat op bestandsnaam. We hernoemen de bestanden bij download,
// dus zetten we de verwijzingen hier op dezelfde namen.
export function linkPrintFiles(input: {
  obj: Buffer;
  mtl: Buffer;
  baseName: string;
}) {
  // Een zip begint met "PK": dan klopt onze aanname over Meshy niet meer.
  if (input.obj.subarray(0, 2).toString("latin1") === "PK") {
    throw new Error("Meshy returned the OBJ as a zip, expected a plain .obj");
  }

  const mtllib = `mtllib ${input.baseName}.mtl`;
  let obj = input.obj.toString("utf8");
  obj = /^mtllib\s/m.test(obj)
    ? obj.replace(/^mtllib\s.*$/m, mtllib)
    : `${mtllib}\n${obj}`;

  const mtl = input.mtl
    .toString("utf8")
    .replace(/^(\s*)map_Kd\s.*$/gm, `$1map_Kd ${input.baseName}.png`)
    // Andere texturen (normal, roughness, ...) downloaden we niet:
    // verwijzingen ernaar zouden in de slicer als ontbrekend bestand opduiken.
    .replace(/^\s*(map_(?!Kd\b)\w+|bump|norm|disp)\s.*(\r?\n|$)/gm, "");

  return { obj: Buffer.from(obj, "utf8"), mtl: Buffer.from(mtl, "utf8") };
}
