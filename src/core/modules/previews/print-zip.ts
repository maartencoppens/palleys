import axios from "axios";
import { strToU8, zipSync, type Zippable } from "fflate";
import { formatDateCompact } from "@/core/utils/format";
import { PRINT_NAME_PREFIX } from "@/data/storage";
import type { PrintDownload } from "./types";
import { linkPrintFiles } from "./utils";

// Client-side: draait in de browser van de admin. De bestanden komen
// rechtstreeks uit R2 via signed URL's, dus niet via onze eigen server.

// Gewone axios, niet de api-instance: dit zijn opslag-URL's, niet /api.
async function fetchText(url: string) {
  const res = await axios.get<string>(url, { responseType: "text" });
  return res.data;
}

async function fetchBytes(url: string) {
  const res = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
  return new Uint8Array(res.data);
}

// Eén model → PAL-...zip met daarin PAL-....obj, .mtl en .png.
async function buildModelZip(download: PrintDownload) {
  const [rawObj, rawMtl, texture] = await Promise.all([
    fetchText(download.urls.obj),
    fetchText(download.urls.mtl),
    fetchBytes(download.urls.texture),
  ]);
  const { obj, mtl } = linkPrintFiles({
    obj: rawObj,
    mtl: rawMtl,
    baseName: download.baseName,
  });

  const name = download.baseName;
  return zipSync({
    [`${name}.obj`]: strToU8(obj),
    [`${name}.mtl`]: strToU8(mtl),
    // Een PNG is al gecomprimeerd: nog eens comprimeren kost alleen tijd.
    [`${name}.png`]: [texture, { level: 0 }],
  });
}

// Eén model: gewoon die zip. Meerdere: een zip met per model een zip erin.
// Model per model, zodat er nooit alle OBJ's tegelijk in het geheugen zitten.
export async function buildPrintZip(downloads: PrintDownload[]) {
  const modelZips: Zippable = {};
  for (const download of downloads) {
    const zip = await buildModelZip(download);
    if (downloads.length === 1) {
      return { fileName: `${download.baseName}.zip`, data: zip };
    }
    modelZips[`${download.baseName}.zip`] = [zip, { level: 0 }];
  }

  const date = formatDateCompact(new Date());
  return {
    fileName: `${PRINT_NAME_PREFIX}-batch-${date}-${downloads.length}.zip`,
    data: zipSync(modelZips),
  };
}

// Laat de browser de zip opslaan.
export function saveFile(fileName: string, data: Uint8Array) {
  const url = URL.createObjectURL(
    new Blob([data as BlobPart], { type: "application/zip" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Even wachten: sommige browsers starten de download pas na de klik-handler.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
