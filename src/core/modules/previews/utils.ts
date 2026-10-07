import { UNPAID_UPLOAD_TTL_MS } from "@/data/retention";

export function unpaidExpiry(from: number = Date.now()) {
  return new Date(from + UNPAID_UPLOAD_TTL_MS);
}

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export function extensionForMime(mimeType: string) {
  return EXT_BY_MIME[mimeType] ?? "bin";
}

export function poseImageKey(previewId: string, mimeType: string) {
  return `previews/${previewId}/pose-${Date.now()}.${extensionForMime(mimeType)}`;
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

// Key per Meshy-taak, niet per tijdstip: wordt dezelfde taak twee keer
// verwerkt (webhook + knop), dan overschrijft de tweede gewoon de eerste.
export function glbKey(previewId: string, taskId: string) {
  return `previews/${previewId}/model-${taskId}.glb`;
}
