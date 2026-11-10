import { COLLECTIBLE_IMAGE_ROUTE, COLLECTIBLE_KEY_PREFIX } from "@/data/collectibles";
import type { Attachment, Edition } from "@/data/options";
import { collectibleId, productCode } from "@/core/utils/naming";

/** "Golden Retriever!" → "golden-retriever". Accents go, so the URL stays plain. */
export function slugify(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** COL-CLP-007 or COL-FIG-007: what an order line for this collectible is, as the customer chose it. */
export function collectibleProductCode(collectibleNr: number, edition: Edition, attachment: Attachment | null) {
  return productCode({ kind: "COL", edition, attachment: edition === "keychain" ? attachment : null, collectibleNr });
}

/** COL-007-HOND, or null while no animal is chosen for it. */
export function collectibleIdOf(collectible: { number: number; animalCode: string | null }) {
  return collectible.animalCode ? collectibleId(collectible.number, collectible.animalCode) : null;
}

/** File names we generate ourselves: a UUID plus .webp. Anything else never reaches R2. */
const IMAGE_FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export function isCollectibleImageFile(fileName: string) {
  return IMAGE_FILE_NAME.test(fileName);
}

export function collectibleImageKey(fileName: string) {
  return `${COLLECTIBLE_KEY_PREFIX}/${fileName}`;
}

export function isCollectibleImageKey(key: string) {
  const prefix = `${COLLECTIBLE_KEY_PREFIX}/`;
  return key.startsWith(prefix) && isCollectibleImageFile(key.slice(prefix.length));
}

/** Public URL of a collectible's image. R2 itself stays private. */
export function collectibleImageUrl(key: string | null) {
  return key ? `${COLLECTIBLE_IMAGE_ROUTE}/${key.slice(COLLECTIBLE_KEY_PREFIX.length + 1)}` : null;
}

// The 3D model: the print-ready zip, private, under a name we choose. Only an admin downloads it, with a signed link.
const MODEL_FOLDER = `${COLLECTIBLE_KEY_PREFIX}/models`;
const MODEL_FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.zip$/;

export function collectibleModelKey(fileName: string) {
  return `${MODEL_FOLDER}/${fileName}`;
}

export function isCollectibleModelKey(key: string) {
  return key.startsWith(`${MODEL_FOLDER}/`) && MODEL_FILE_NAME.test(key.slice(MODEL_FOLDER.length + 1));
}


