"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { describeModelMeta, type ModelMeta } from "@/core/modules/print-prep/model-meta";
import { postRefreshProcessedMeta } from "@/core/modules/print-prep/api";
import { postRefreshCollectibleModelMeta } from "@/core/modules/collectibles/api";

/** Where the zip is: a preview's processed file, or one version of a collectible's model. */
type MetaSource = { previewId: string } | { collectibleId: string; modelId: string };
import { getApiErrorMessage } from "@/core/networking/api";

/*
 * Size, triangles and texture of a print zip, read from the file itself (no rendering): enough to see that the right
 * model went up. Without them (uploaded before we read them), a link reads them now.
 */
export function ModelMetaInfo({ meta, source }: { meta: ModelMeta | null; source?: MetaSource }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (meta) {
    const text = describeModelMeta(meta);
    return (
      <ul className="space-y-0.5 text-xs whitespace-nowrap text-text-muted tabular-nums">
        <li>{text.dimensions}</li>
        <li>{text.triangles}</li>
        <li>{text.texture}</li>
      </ul>
    );
  }
  if (!source) return <span className="text-xs text-text-muted">—</span>;

  async function read() {
    setBusy(true);
    setError(null);
    try {
      if ("previewId" in source!) await postRefreshProcessedMeta(source.previewId);
      else await postRefreshCollectibleModelMeta(source!.collectibleId, source!.modelId);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={read}
        disabled={busy}
        className="rounded font-label font-bold text-medium-green underline underline-offset-4 hover:text-orange disabled:opacity-60"
      >
        {busy ? "Lezen…" : "Gegevens lezen"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
