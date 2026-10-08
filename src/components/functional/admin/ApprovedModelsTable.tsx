"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PreviewStatus } from "@/db/client";
import { postDownloadModels } from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { formatDateTime } from "@/core/utils/format";
import { Badge } from "@/components/design/Badge";
import { Button } from "@/components/design/Button";

type Model = {
  id: string;
  status: PreviewStatus;
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
      const files = await postDownloadModels(selected);
      for (const file of files) {
        const link = document.createElement("a");
        link.href = file.url;
        link.click();
        // Kleine pauze: zonder pauze slaat de browser soms bestanden over.
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
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
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setSelected(newIds)}>
          Selecteer nieuwe ({newIds.length})
        </Button>
        <Button
          loading={loading}
          loadingText="Downloaden…"
          disabled={selected.length === 0}
          onClick={handleDownload}
        >
          Download ({selected.length})
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3 font-medium">Aangemaakt</th>
              <th className="px-4 py-3 font-medium">Gedownload</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(m.id)}
                    onChange={() => toggle(m.id)}
                    aria-label={`Selecteer ${m.id}`}
                  />
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatDateTime(m.createdAt)}
                </td>
                <td className="px-4 py-3">
                  {m.downloadedAt ? (
                    <span className="text-muted">
                      {m.downloadedBy} · {formatDateTime(m.downloadedAt)}
                    </span>
                  ) : (
                    <Badge tone="waiting">Nieuw</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/previews/${m.id}`}
                    className="font-semibold text-accent hover:underline"
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
