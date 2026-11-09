import { UNPAID_UPLOAD_TTL_MS } from "@/data/retention";
import { IMAGE_EXTENSIONS } from "@/data/uploads";
import { PREVIEW_KEY_PREFIX } from "@/data/storage";
import { palleyFileName, previewRef } from "@/core/utils/naming";
import { collectibleIdOf } from "@/core/modules/collectibles/utils";
import { palleyNameOf, type PalleyNameSource } from "@/core/modules/orders/utils";
import { PAID_ORDER_STATUSES } from "@/core/modules/orders/status";

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

// Willekeurige naam: foto's worden los toegevoegd en verwijderd.
export function photoKey(previewId: string, mimeType: string) {
  return `${previewFolder(previewId)}/photo-${crypto.randomUUID()}.${extensionForMime(mimeType)}`;
}

// Hoort deze key bij een foto van deze preview? Controle voor keys die
// de browser ons terugstuurt na een upload.
export function isPhotoKeyOf(previewId: string, key: string) {
  return (
    key.startsWith(`${previewFolder(previewId)}/photo-`) && !key.includes("..")
  );
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

// What a preview's print name needs: its order line on a paid order, or the collectible it was made for.
export const PRINT_NAME_SELECT = {
  id: true,
  forCollectible: true,
  collectible: { select: { number: true, animalCode: true } },
  orderItems: {
    where: { order: { status: { in: PAID_ORDER_STATUSES } } },
    // The first print, not a reprint of it.
    orderBy: { reprintNr: "asc" },
    select: { position: true, productCode: true, reprintNr: true, order: { select: { number: true, reprintOf: { select: { number: true } } } } },
    take: 1,
  },
} as const;

export type PrintNameSource = {
  id: string;
  forCollectible: boolean;
  collectible: { number: number; animalCode: string | null } | null;
  orderItems: PalleyNameSource[];
};

/**
 * The base name of a preview's print files, without extension (core/utils/naming.ts): the Palley's name once its order
 * is paid (PAL-PLY1042-01-P-RING-KAT), the collectible's id for a new collectible's model (COL-007-HOND), and
 * PRV-A3F9C2E1 for anything else. Never the customer's name.
 */
export function printBaseName(preview: PrintNameSource) {
  const item = preview.orderItems[0];
  const fromOrder = item ? palleyNameOf(item) : null;
  const fromCollectible = preview.forCollectible && preview.collectible ? collectibleIdOf(preview.collectible) : null;
  return fromOrder ?? fromCollectible ?? previewRef(preview.id);
}

/** The order a preview was paid in, through its order line. */
export function paidOrderNumber(preview: Pick<PrintNameSource, "orderItems">) {
  return preview.orderItems[0]?.order.number ?? null;
}

// Een OBJ verwijst via `mtllib` naar zijn MTL, en de MTL via `map_Kd` naar
// de PNG. Dat gaat op bestandsnaam. De naam ligt pas vast bij het downloaden
// (de order kan nog betaald worden), dus herschrijven we dan pas.
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

  const mtllib = `mtllib ${palleyFileName(input.baseName, "mtl")}`;
  const obj = /^mtllib\s/m.test(input.obj)
    ? input.obj.replace(/^mtllib\s.*$/m, mtllib)
    : `${mtllib}\n${input.obj}`;

  const mtl = input.mtl
    .replace(/^(\s*)map_Kd\s.*$/gm, `$1map_Kd ${palleyFileName(input.baseName, "texture")}`)
    // Andere texturen (normal, roughness, ...) downloaden we niet:
    // verwijzingen ernaar zouden in de slicer als ontbrekend bestand opduiken.
    .replace(/^\s*(map_(?!Kd\b)\w+|bump|norm|disp)\s.*(\r?\n|$)/gm, "");

  return { obj, mtl };
}

/** The prompt for one animal code: its own full prompt, or the general one when it has none (or there's no animal). */
export function posePrompt(prompts: { base: string; animals: Partial<Record<string, string>> }, animalType: string | null) {
  return (animalType && prompts.animals[animalType]?.trim()) || prompts.base.trim();
}
