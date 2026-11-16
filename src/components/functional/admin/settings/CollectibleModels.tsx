"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  deleteCollectibleModelVersion,
  downloadCollectibleModel,
  putActiveCollectibleModel,
  uploadCollectibleModelVersion,
} from "@/core/modules/collectibles/api";
import type { CollectibleGeneration, CollectibleModelVersion } from "@/core/modules/collectibles/types";
import { getApiErrorMessage } from "@/core/networking/api";
import { formatDateTime } from "@/core/utils/format";
import { MAX_PRINT_FILE_BYTES } from "@/data/uploads";
import { Badge } from "@/components/design/Badge";
import { Button } from "@/components/design/Button";
import { PreviewStatusBadge } from "@/components/functional/admin/PreviewStatusBadge";
import { ModelMetaInfo } from "@/components/functional/admin/ModelMetaInfo";
import { SettingsCard } from "./SettingsParts";

const linkClassName = "rounded font-label text-sm font-bold underline underline-offset-4 transition-colors disabled:opacity-50";

type CollectibleModelsProps = {
  collectibleId: string;
  versions: CollectibleModelVersion[];
  generations: CollectibleGeneration[];
  archived: boolean;
};

/*
 * Every 3D model a collectible ever had, side by side: generated ones with their pose, uploaded ones by name, each with
 * its size, triangles and texture. One is in use (orders print that one); any other can be picked instead. A new model
 * is generated for this collectible (it never makes a new one) or uploaded as one more version.
 */
export function CollectibleModels({ collectibleId, versions, generations, archived }: CollectibleModelsProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) return setError("Kies de printklare .zip uit Blender (OBJ + MTL + PNG).");
    if (file.size > MAX_PRINT_FILE_BYTES) return setError("Dit bestand is groter dan 200 MB.");
    const activate = versions.length === 0 || window.confirm("Dit model meteen gebruiken voor nieuwe bestellingen? (Annuleren = als extra versie bewaren)");
    void run("upload", () => uploadCollectibleModelVersion(collectibleId, file, activate));
  }

  return (
    <SettingsCard
      title="3D-modellen"
      intro="De printklare zips uit Blender (OBJ + MTL + PNG). Bestellingen gebruiken het gekozen model; oudere versies blijven staan om te vergelijken en terug te kiezen."
    >
      <div className="flex flex-wrap gap-3">
        {!archived && (
          <Button variant="primary" href={`/admin/settings/collectibles/generate?collectible=${collectibleId}`}>
            {versions.length > 0 ? "Nieuw model genereren" : "Model genereren"}
          </Button>
        )}
        <Button variant="secondary" loading={busy === "upload"} loadingText="Uploaden…" disabled={busy !== null} onClick={() => inputRef.current?.click()}>
          Zip uploaden
        </Button>
        <input ref={inputRef} type="file" accept=".zip,application/zip" onChange={handleFile} className="hidden" />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[#a3341a]">
          {error}
        </p>
      )}

      {generations.length > 0 && (
        <div className="mt-5">
          <p className="font-label text-sm font-bold text-text-muted">Wordt gemaakt</p>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {generations.map((generation) => (
              <li key={generation.previewId} className="flex items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-medium-green/25 p-3">
                <Thumbnail url={generation.poseUrl} />
                <div className="min-w-0 flex-1 space-y-1">
                  <PreviewStatusBadge status={generation.status} />
                  <p className="text-xs text-text-muted">Gestart {formatDateTime(generation.createdAt)}</p>
                  <Link href={`/admin/previews/${generation.previewId}`} className={`${linkClassName} text-medium-green hover:text-orange`}>
                    Naar de preview
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {versions.length === 0 ? (
        <p className="mt-5 text-base text-text-muted">Nog geen 3D-model.</p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {versions.map((version, index) => (
            <li
              key={version.id}
              className={`flex gap-3 rounded-2xl border-[1.5px] p-3 ${version.active ? "border-medium-green bg-light-green/40" : "border-off-white-dark"}`}
            >
              <Thumbnail url={version.poseUrl} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-label text-sm font-bold">Versie {versions.length - index}</span>
                  {version.active && <Badge tone="success">In gebruik</Badge>}
                  <Badge>{version.previewId ? "Gegenereerd" : "Geüpload"}</Badge>
                </div>
                <p className="text-xs text-text-muted">
                  {formatDateTime(version.createdAt)}
                  {version.createdBy && ` · ${version.createdBy}`}
                </p>
                <ModelMetaInfo meta={version.meta} source={{ collectibleId, modelId: version.id }} />
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  {!version.active && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => run(version.id, () => putActiveCollectibleModel(collectibleId, version.id))}
                      className={`${linkClassName} text-medium-green hover:text-orange`}
                    >
                      {busy === version.id ? "Bezig…" : "Dit model gebruiken"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => run(`download-${version.id}`, () => downloadCollectibleModel(collectibleId, version.id))}
                    className={`${linkClassName} text-medium-green hover:text-orange`}
                  >
                    Download
                  </button>
                  {version.previewId && (
                    <Link href={`/admin/previews/${version.previewId}`} className={`${linkClassName} text-medium-green hover:text-orange`}>
                      Preview
                    </Link>
                  )}
                  {!version.active && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        if (window.confirm("Deze versie definitief verwijderen?")) void run(`delete-${version.id}`, () => deleteCollectibleModelVersion(collectibleId, version.id));
                      }}
                      className={`${linkClassName} text-[#a3341a]`}
                    >
                      Verwijderen
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  );
}

function Thumbnail({ url }: { url: string | null }) {
  return (
    <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-light-green text-[10px] text-text-muted">
      {/* Signed R2 link: plain <img>, not the image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" className="size-full object-contain" /> : "Geen pose"}
    </div>
  );
}
