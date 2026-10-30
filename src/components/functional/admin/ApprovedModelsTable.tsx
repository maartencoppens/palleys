"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PreviewStatus } from "@/db/client";
import { postDownloadModels } from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { formatDateTime } from "@/core/utils/format";
import { Badge } from "@/components/design/Badge";
import Button from "@/components/design/Button";
import { buildPrintZip, saveFile } from "@/core/modules/previews/print-zip";

type Model = {
  id: string;
  status: PreviewStatus;
  quantity: number;
  createdAt: string;
  downloadedAt: string | null;
  downloadedBy: string | null;
};

export function ApprovedModelsTable({ models }: { models: Model[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const downloads = await postDownloadModels(selected);
      const zip = await buildPrintZip(downloads);
      saveFile(zip.fileName, zip.data);
      setSelected([]);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const newIds = models.filter((m) => !m.downloadedAt).map((m) => m.id);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setSelected(newIds)}>
          Selecteer nieuwe ({newIds.length})
        </Button>
        <Button
          variant="primary"
          loading={loading}
          loadingText="Downloaden…"
          disabled={selected.length === 0}
          onClick={handleDownload}
        >
          Download ({selected.length})
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#a3341a]">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-3xl bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b-[1.5px] border-off-white-dark font-label text-text-muted">
            <tr>
              <th className="w-10 px-5 py-4" />
              <th className="px-5 py-4 font-semibold">Aangemaakt</th>
              <th className="px-5 py-4 font-semibold">Aantal</th>
              <th className="px-5 py-4 font-semibold">Gedownload</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id} className="border-b border-off-white-dark last:border-0">
                <td className="px-5 py-4">
                  <input
                    type="checkbox"
                    className="size-5 accent-medium-green"
                    checked={selected.includes(m.id)}
                    onChange={() => toggle(m.id)}
                    aria-label={`Selecteer ${m.id}`}
                  />
                </td>
                <td className="px-5 py-4 tabular-nums">
                  {formatDateTime(m.createdAt)}
                </td>
                <td className="px-5 py-4">
                  {m.quantity > 1 ? <Badge tone="waiting">{m.quantity}×</Badge> : "1"}
                </td>
                <td className="px-5 py-4">
                  {m.downloadedAt ? (
                    <span className="text-text-muted">
                      {m.downloadedBy} · {formatDateTime(m.downloadedAt)}
                    </span>
                  ) : (
                    <Badge tone="waiting">Nieuw</Badge>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/admin/previews/${m.id}`}
                    className="rounded font-label font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
                  >
                    Bekijken
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
