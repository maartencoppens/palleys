import { COLLECTIBLE_IMAGE_ROUTE, COLLECTIBLE_KEY_PREFIX, COLLECTIBLE_SKU_PREFIX } from "@/data/collectibles";

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

export function skuForSlug(slug: string) {
  return `${COLLECTIBLE_SKU_PREFIX}-${slug.toUpperCase()}`;
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

