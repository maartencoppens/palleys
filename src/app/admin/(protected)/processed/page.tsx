import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getCollectiblePrintQueue, getProcessingOverview } from "@/core/modules/print-prep/service";
import type { CollectiblePrintItem, ProcessingItem } from "@/core/modules/print-prep/types";
import { attachments } from "@/data/options";
import { CollectibleModelButton } from "@/components/functional/admin/orders/CollectibleModelButton";
import { formatDateTime } from "@/core/utils/format";
import { Badge } from "@/components/design/Badge";
import { ProcessedFileActions } from "@/components/functional/admin/ProcessedFileActions";

export const instant = false;

export default async function AdminProcessedPage() {
  await requireAdminPage();
  const [{ inProgress, printReady }, collectibles] = await Promise.all([getProcessingOverview(), getCollectiblePrintQueue()]);

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

      <section className="mt-12">
        <h2 className="font-display text-xl font-medium text-medium-green">
          Collectibles om te printen ({collectibles.length})
        </h2>
        <p className="mt-1 text-base text-text-muted">
          Uit betaalde orders, nog niet afgevinkt. Ze gaan niet door de AI-pipeline: print het vaste model van de collectible.
        </p>
        <CollectibleTable items={collectibles} />
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
      <table className="admin-table w-full text-left text-sm">
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
                <td data-label="Aantal" className="px-5 py-4">
                  {item.quantity > 1 ? <Badge tone="waiting">{item.quantity}×</Badge> : "1"}
                </td>
                <td data-label={dateLabel} className="whitespace-nowrap px-5 py-4 text-text-muted">
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

function CollectibleTable({ items }: { items: CollectiblePrintItem[] }) {
  if (items.length === 0) {
    return (
      <p className="mt-4 rounded-3xl border-2 border-dashed border-medium-green/25 px-6 py-8 text-center text-base text-text-muted">
        Geen collectibles om te printen.
      </p>
    );
  }
  return (
    <div className="mt-4 overflow-x-auto rounded-3xl bg-white">
      <table className="admin-table w-full text-left text-sm">
        <thead className="border-b-[1.5px] border-off-white-dark font-label text-text-muted">
          <tr>
            <th className="px-5 py-4 font-semibold">Collectible</th>
            <th className="px-5 py-4 font-semibold">Order</th>
            <th className="px-5 py-4 font-semibold">Aantal</th>
            <th className="px-5 py-4 font-semibold">Bevestiging</th>
            <th className="px-5 py-4">
              <span className="sr-only">Acties</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.itemId} className="border-b border-off-white-dark last:border-0">
              <td className="px-5 py-4 font-semibold">
                {item.name}
                {item.palleyName && (
                  <span className="block font-mono text-xs font-normal break-all text-text-muted">{item.palleyName}</span>
                )}
              </td>
              <td data-label="Order" className="px-5 py-4">
                <Link
                  href={`/admin/orders/${item.orderId}`}
                  className="rounded font-mono text-xs font-semibold text-medium-green underline-offset-4 hover:underline"
                >
                  {item.orderNumber}
                </Link>
              </td>
              <td data-label="Aantal" className="px-5 py-4">
                {item.quantity > 1 ? <Badge tone="waiting">{item.quantity}×</Badge> : "1"}
              </td>
              <td data-label="Bevestiging" className="px-5 py-4">
                {attachments.find((option) => option.value === item.attachment)?.label ?? "—"}
              </td>
              <td className="px-5 py-4 text-right">
                {item.hasModel ? (
                  <CollectibleModelButton collectibleId={item.collectibleId} />
                ) : (
                  <Link
                    href={`/admin/settings/collectibles/${item.collectibleId}`}
                    className="font-label text-sm font-bold text-[#a3341a] underline underline-offset-4"
                  >
                    Nog geen 3D-model: uploaden
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
