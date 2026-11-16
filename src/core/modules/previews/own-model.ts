import { MAX_PRINT_FILE_BYTES } from "@/data/uploads";

/* An own 3D model in the browser: the same words and checks on the preview page and in the manual order form. */

export const OWN_MODEL_HELP =
  "Eén zip met het OBJ-bestand, het MTL-bestand en de textuur (PNG of JPG), zoals een export uit Blender of Meshy. Een GLB erbij mag, voor de 3D-viewer.";

/** Checks a chosen file before uploading; null when it's fine. The server checks what's inside. */
export function ownModelFileProblem(file: { name: string; size: number }) {
  if (!file.name.toLowerCase().endsWith(".zip")) return "Kies een .zip met het 3D-model";
  if (file.size > MAX_PRINT_FILE_BYTES) return "Een 3D-model is maximaal 200 MB";
  return null;
}
