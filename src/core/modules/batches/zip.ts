import "server-only";
import { strToU8, Zip, ZipPassThrough } from "fflate";
import { getObjectStream } from "@/core/networking/external/storage-client";
import { manifestCsv, manifestPath, type ManifestRow, type ZipEntry } from "./utils";

/*
 * The batch zip, streamed: each print file comes from R2 and goes straight on to the browser, so a batch of hundreds
 * of megabytes never sits in memory. The inner files are zips already, so they are stored, not compressed again.
 * Pulled: the next chunk is only read from R2 when the browser takes the previous one.
 * The app runs as a long-lived `next start` on our own server, so a long streamed response is fine; a copy in R2
 * would double the storage and need cleaning up. Every file was checked to exist before this starts
 * (prepareBatchZip); if R2 fails halfway anyway, the stream errors and the browser shows a failed download.
 */
export async function* batchZipChunks(ref: string, entries: ZipEntry[], manifest: ManifestRow[]) {
  const ready: Uint8Array[] = [];
  let failure: Error | null = null;
  const zip = new Zip((error, chunk) => {
    if (error) failure = error;
    else ready.push(chunk);
  });
  function* drain() {
    if (failure) throw failure;
    while (ready.length > 0) yield ready.shift()!;
  }

  for (const entry of entries) {
    const file = new ZipPassThrough(entry.path);
    zip.add(file);
    for await (const chunk of await getObjectStream(entry.key)) {
      file.push(chunk);
      yield* drain();
    }
    file.push(new Uint8Array(0), true);
    yield* drain();
  }
  const list = new ZipPassThrough(manifestPath(ref));
  zip.add(list);
  list.push(strToU8(manifestCsv(manifest)), true);
  zip.end();
  yield* drain();
}

/** The chunks as a web stream for a Response. */
export function toReadableStream(chunks: AsyncGenerator<Uint8Array>) {
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await chunks.next();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await chunks.return(undefined);
    },
  });
}
