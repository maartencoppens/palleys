import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getProcessingOverview } from "@/core/modules/print-prep/service";
import type { ProcessingItem } from "@/core/modules/print-prep/types";
import { formatDateTime } from "@/core/utils/format";
import { ProcessedFileActions } from "@/components/functional/admin/ProcessedFileActions";

export default async function AdminProcessedPage() {
  await requireAdminPage();
  const { inProgress, printReady } = await getProcessingOverview();

  return (
    <main>
      <h1 className="text-4xl font-semibold tracking-tight font-stretch-semi-condensed">
        Processed
      </h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">In Blender ({inProgress.length})</h2>
        <p className="mt-1 text-sm text-muted">
          Gedownload uit Goedgekeurd. Upload de zip zodra hij print ready is.
        </p>
        <ProcessingTable
          items={inProgress}
          dateLabel="Gedownload"
          dateOf={(item) => item.downloadedAt}
          byOf={(item) => item.downloadedBy}
          hasProcessedFile={false}
          emptyText="Er ligt niets in Blender."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">
          Klaar voor print ({printReady.length})
        </h2>
        <ProcessingTable
          items={printReady}
          dateLabel="Verwerkt"
          dateOf={(item) => item.processedAt}
          byOf={(item) => item.processedBy}
          hasProcessedFile
          emptyText="Nog geen verwerkte modellen."
        />
      </section>
    </main>
  );
}

type ProcessingTableProps = {
  items: ProcessingItem[];
  dateLabel: string;
  dateOf: (item: ProcessingItem) => string | null;
  byOf: (item: ProcessingItem) => string | null;
  hasProcessedFile: boolean;
  emptyText: string;
};

function ProcessingTable({
  items,
  dateLabel,
  dateOf,
  byOf,
  hasProcessedFile,
  emptyText,
}: ProcessingTableProps) {
  if (items.length === 0) {
    return (
      <p className="mt-4 rounded-lg border border-dashed border-line px-6 py-8 text-center text-sm text-muted">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Bestandsnaam</th>
            <th className="px-4 py-3 font-medium">{dateLabel}</th>
            <th className="px-4 py-3">
              <span className="sr-only">Acties</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const date = dateOf(item);
            return (
              <tr key={item.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/previews/${item.id}`}
                    className="font-mono text-xs hover:underline"
                  >
                    {item.baseName}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {date ? `${byOf(item)} · ${formatDateTime(date)}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <ProcessedFileActions
                    previewId={item.id}
                    hasProcessedFile={hasProcessedFile}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
