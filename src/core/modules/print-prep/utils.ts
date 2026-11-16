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

/*
 * Bulk upload from a folder: which zip belongs to which model, by file name. A file belongs to the model whose print
 * name it starts with (PAL-PLY1042-01-P-RING-KAT.zip, …_print.zip, "… (1).zip"); the longest name wins, so a reprint
 * (…-R1) never lands on the first print. Case and spaces around it don't matter.
 */
export type BulkMatch<T> = { file: string; item: T | null };

const normalize = (value: string) => value.trim().toUpperCase();

export function matchProcessedFiles<T extends { baseName: string }>(fileNames: string[], items: T[]): BulkMatch<T>[] {
  const byLength = [...items].sort((a, b) => b.baseName.length - a.baseName.length);
  return fileNames.map((file) => {
    const name = normalize(file.replace(/\.zip$/i, ""));
    const item =
      byLength.find((candidate) => {
        const base = normalize(candidate.baseName);
        if (!name.startsWith(base)) return false;
        const rest = name.slice(base.length);
        // Right after the name: nothing, or something that can't continue it (a letter, digit or -R1 would).
        return rest === "" || (/^[^A-Z0-9]/.test(rest) && !/^-R\d/.test(rest));
      }) ?? null;
    return { file, item };
  });
}
