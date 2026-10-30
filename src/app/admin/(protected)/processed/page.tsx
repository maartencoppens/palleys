import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getProcessingOverview } from "@/core/modules/print-prep/service";
import type { ProcessingItem } from "@/core/modules/print-prep/types";
import { formatDateTime } from "@/core/utils/format";
import { Badge } from "@/components/design/Badge";
import { ProcessedFileActions } from "@/components/functional/admin/ProcessedFileActions";

export default async function AdminProcessedPage() {
  await requireAdminPage();
  const { inProgress, printReady } = await getProcessingOverview();

  return (
    <main>
      <h1 className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green">
        Processed
      </h1>

      <section className="mt-8">
        <h2 className="font-display text-xl font-medium text-medium-green">In Blender ({inProgress.length})</h2>
        <p className="mt-1 text-base text-text-muted">
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
        <h2 className="font-display text-xl font-medium text-medium-green">
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
      <p className="mt-4 rounded-3xl border-2 border-dashed border-medium-green/25 px-6 py-8 text-center text-base text-text-muted">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-3xl bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b-[1.5px] border-off-white-dark font-label text-text-muted">
          <tr>
            <th className="px-5 py-4 font-semibold">Bestandsnaam</th>
            <th className="px-5 py-4 font-semibold">Aantal</th>
            <th className="px-5 py-4 font-semibold">{dateLabel}</th>
            <th className="px-5 py-4">
              <span className="sr-only">Acties</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const date = dateOf(item);
            return (
              <tr key={item.id} className="border-b border-off-white-dark last:border-0">
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/previews/${item.id}`}
                    className="rounded font-mono text-xs font-semibold text-medium-green underline-offset-4 hover:underline"
                  >
                    {item.baseName}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  {item.quantity > 1 ? <Badge tone="waiting">{item.quantity}×</Badge> : "1"}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-text-muted">
                  {date ? `${byOf(item)} · ${formatDateTime(date)}` : "—"}
                </td>
                <td className="px-5 py-4">
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
