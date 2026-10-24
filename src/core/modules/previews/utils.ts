import { UNPAID_UPLOAD_TTL_MS } from "@/data/retention";
import { IMAGE_EXTENSIONS } from "@/data/uploads";
import {
  NO_ORDER_LABEL,
  PREVIEW_KEY_PREFIX,
  PRINT_NAME_PREFIX,
} from "@/data/storage";
import { formatDateCompact } from "@/core/utils/format";

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

// PAL-<ordernummer>-<model>-<dier>-<orderdatum>, zonder extensie.
// Zonder order (testpreviews) staat er NOORDER en valt de datum terug op
// de aanmaakdatum. Alles wat geen letter of cijfer is, gaat eruit ("#1042").
export function printFileBaseName(preview: {
  id: string;
  shopifyOrderNumber: string | null;
  animalType: string | null;
  paidAt: Date | null;
  createdAt: Date;
}) {
  const order = preview.shopifyOrderNumber?.replace(/[^a-zA-Z0-9]/g, "");
  return [
    PRINT_NAME_PREFIX,
    order || NO_ORDER_LABEL,
    preview.id.slice(0, 8),
    preview.animalType ?? "UNKNOWN",
    formatDateCompact(preview.paidAt ?? preview.createdAt),
  ].join("-");
}

// Een OBJ verwijst via `mtllib` naar zijn MTL, en de MTL via `map_Kd` naar
// de PNG. Dat gaat op bestandsnaam. De naam ligt pas vast bij het downloaden
// (dier en order kunnen nog wijzigen), dus herschrijven we dan pas.
// Werkt met strings zodat het ook in de browser draait.
export function linkPrintFiles(input: {
  obj: string;
  mtl: string;
  baseName: string;
}) {
  // Een zip begint met "PK": dan klopt onze aanname over Meshy niet meer.
  if (input.obj.startsWith("PK")) {
    throw new Error("Meshy returned the OBJ as a zip, expected a plain .obj");
  }

  const mtllib = `mtllib ${input.baseName}.mtl`;
  const obj = /^mtllib\s/m.test(input.obj)
    ? input.obj.replace(/^mtllib\s.*$/m, mtllib)
    : `${mtllib}\n${input.obj}`;

  const mtl = input.mtl
    .replace(/^(\s*)map_Kd\s.*$/gm, `$1map_Kd ${input.baseName}.png`)
    // Andere texturen (normal, roughness, ...) downloaden we niet:
    // verwijzingen ernaar zouden in de slicer als ontbrekend bestand opduiken.
    .replace(/^\s*(map_(?!Kd\b)\w+|bump|norm|disp)\s.*(\r?\n|$)/gm, "");

  return { obj, mtl };
}
