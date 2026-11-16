"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadProcessedFile } from "@/core/modules/print-prep/api";
import { matchProcessedFiles } from "@/core/modules/print-prep/utils";
import { getApiErrorMessage } from "@/core/networking/api";
import { MAX_PRINT_FILE_BYTES } from "@/data/uploads";
import { Button } from "@/components/design/Button";
import { Badge } from "@/components/design/Badge";

export type BulkUploadItem = { id: string; baseName: string; hasProcessedFile: boolean };

type RowStatus = "waiting" | "uploading" | "done" | "error" | "skipped";
type Row = {
  file: File;
  item: BulkUploadItem | null;
  /** A second file for a model that already has one in this folder: only the first goes. */
  duplicate: boolean;
  include: boolean;
  status: RowStatus;
  error: string | null;
};

const isZip = (file: File) => file.name.toLowerCase().endsWith(".zip") && !file.name.startsWith("._");

/*
 * One folder with the zips from Blender: every zip is matched to its model by its name (the print name, as the download
 * from Goedgekeurd called it) and uploaded the same way as one by one. Nothing goes until the admin checked the list;
 * a model that already has a processed file is only replaced when ticked.
 */
export function BulkProcessedUpload({ items }: { items: BulkUploadItem[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // React has no prop for it: a folder picker instead of a file picker.
  useEffect(() => {
    inputRef.current?.setAttribute("webkitdirectory", "");
    inputRef.current?.setAttribute("directory", "");
  }, []);

  function handleFolder(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter(isZip);
    event.target.value = "";
    setMessage(null);
    if (files.length === 0) {
      setRows(null);
      setMessage("Geen .zip-bestanden in deze folder.");
      return;
    }
    const seen = new Set<string>();
    const matches = matchProcessedFiles(
      files.map((file) => file.name),
      items,
    );
    setRows(
      files
        .map((file, index) => {
          const item = matches[index].item;
          const duplicate = item !== null && seen.has(item.id);
          if (item) seen.add(item.id);
          const tooBig = file.size > MAX_PRINT_FILE_BYTES;
          return {
            file,
            item,
            duplicate,
            include: item !== null && !duplicate && !item.hasProcessedFile && !tooBig,
            status: "waiting" as RowStatus,
            error: tooBig ? "Groter dan 200 MB" : null,
          };
        })
        .sort((a, b) => Number(b.item !== null) - Number(a.item !== null) || a.file.name.localeCompare(b.file.name)),
    );
  }

  function toggle(index: number) {
    setRows((current) => current && current.map((row, i) => (i === index ? { ...row, include: !row.include } : row)));
  }

  async function uploadAll() {
    if (!rows) return;
    setRunning(true);
    setMessage(null);
    let done = 0;
    let failed = 0;
    for (const [index, row] of rows.entries()) {
      if (!row.include || !row.item) continue;
      setRows((current) => current && current.map((r, i) => (i === index ? { ...r, status: "uploading", error: null } : r)));
      try {
        await uploadProcessedFile(row.item.id, row.file);
        done++;
        setRows((current) => current && current.map((r, i) => (i === index ? { ...r, status: "done", include: false } : r)));
      } catch (e) {
        failed++;
        const error = getApiErrorMessage(e, "Uploaden mislukt");
        setRows((current) => current && current.map((r, i) => (i === index ? { ...r, status: "error", error } : r)));
      }
    }
    setRunning(false);
    setMessage(`${done} ${done === 1 ? "model" : "modellen"} geüpload${failed ? `, ${failed} mislukt` : ""}.`);
    router.refresh();
  }

  const selected = rows?.filter((row) => row.include && row.item).length ?? 0;
  const matchedIds = new Set(rows?.flatMap((row) => (row.item ? [row.item.id] : [])) ?? []);
  const missing = rows ? items.filter((item) => !item.hasProcessedFile && !matchedIds.has(item.id)) : [];

  return (
    <div className="mt-4 rounded-3xl bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          Een hele folder in één keer: elke zip gaat naar het model met dezelfde naam (bv. <span className="font-mono">PAL-PLY1042-01-P-RING-KAT.zip</span>).
        </p>
        <Button variant="primary" disabled={running} onClick={() => inputRef.current?.click()}>
          Folder uploaden
        </Button>
        <input ref={inputRef} type="file" multiple onChange={handleFolder} className="hidden" />
      </div>

      {rows && (
        <div className="mt-4">
          <ul className="divide-y divide-off-white-dark text-sm">
            {rows.map((row, index) => (
              <li key={`${row.file.name}-${index}`} className="flex flex-wrap items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label={`${row.file.name} uploaden`}
                  checked={row.include}
                  disabled={running || !row.item || row.duplicate || row.status === "done" || row.file.size > MAX_PRINT_FILE_BYTES}
                  onChange={() => toggle(index)}
                  className="size-5 accent-medium-green"
                />
                <span className="min-w-0 flex-1 break-all font-mono text-xs">{row.file.name}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {!row.item && <Badge tone="danger">Geen model met deze naam</Badge>}
                  {row.duplicate && <Badge tone="waiting">Dubbel: alleen de eerste gaat</Badge>}
                  {row.item && !row.duplicate && row.item.hasProcessedFile && row.status !== "done" && (
                    <Badge tone="waiting">Al geüpload: aanvinken om te vervangen</Badge>
                  )}
                  {row.status === "uploading" && <Badge tone="waiting">Uploaden…</Badge>}
                  {row.status === "done" && <Badge tone="success">Geüpload</Badge>}
                  {row.error && <Badge tone="danger">{row.error}</Badge>}
                </span>
              </li>
            ))}
          </ul>
          {missing.length > 0 && (
            <p className="mt-3 text-sm text-text-muted">
              Nog zonder zip in deze folder: <span className="font-mono text-xs">{missing.map((item) => item.baseName).join(", ")}</span>
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="primary" loading={running} loadingText="Uploaden…" disabled={selected === 0 || running} onClick={uploadAll}>
              {selected === 1 ? "1 model uploaden" : `${selected} modellen uploaden`}
            </Button>
            <Button variant="secondary" disabled={running} onClick={() => setRows(null)}>
              Sluiten
            </Button>
          </div>
        </div>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm font-semibold text-medium-green">
          {message}
        </p>
      )}
    </div>
  );
}
