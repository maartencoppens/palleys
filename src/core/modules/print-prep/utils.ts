import { PREVIEW_KEY_PREFIX } from "@/data/storage";

// Willekeurige naam: bij opnieuw uploaden komt er een nieuw bestand en
// wordt het oude pas verwijderd als het nieuwe veilig in de database staat.
export function processedKey(previewId: string) {
  return `${PREVIEW_KEY_PREFIX}/${previewId}/processed-${crypto.randomUUID()}.zip`;
}

// Hoort deze key bij deze preview? Controle voor keys die de browser
// ons terugstuurt na een upload.
export function isProcessedKeyOf(previewId: string, key: string) {
  return (
    key.startsWith(`${PREVIEW_KEY_PREFIX}/${previewId}/processed-`) &&
    !key.includes("..")
  );
}
