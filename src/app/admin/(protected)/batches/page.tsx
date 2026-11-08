import { requireAdminPage } from "@/core/modules/auth/service";
import { getBatchesPage } from "@/core/modules/batches/service";
import { batchZipName } from "@/core/utils/naming";
import { formatDateTime } from "@/core/utils/format";
import { ReadyOrdersPicker } from "@/components/functional/admin/batches/ReadyOrdersPicker";
import { BatchOrderCard } from "@/components/functional/admin/batches/BatchOrderList";
import { BatchActionButton, BatchZipButton, DeleteBatchButton, RemoveFromBatchButton } from "@/components/functional/admin/batches/BatchButtons";

export const instant = false;

const h1 = "font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green";
const h2 = "font-display text-xl font-medium text-medium-green";
const empty = "mt-4 rounded-3xl border-2 border-dashed border-medium-green/25 px-6 py-8 text-center text-base text-text-muted";

export default async function AdminBatchesPage() {
  await requireAdminPage();
  const { ready, waiting, openBatches } = await getBatchesPage();

  return (
    <main>
      <h1 className={h1}>Batches</h1>
      <p className="mt-1 max-w-[46rem] text-base text-text-muted">
        Betaalde orders waarvan elk item printklaar is, samen naar JLC. Een order gaat altijd volledig in één batch.
      </p>

      <section className="mt-8">
        <h2 className={h2}>Orders zonder batch ({ready.length})</h2>
        {waiting > 0 && (
          <p className="mt-1 text-sm text-text-muted">
            Nog {waiting} {waiting === 1 ? "order" : "orders"} onderweg in de pipeline: die verschijnen hier zodra alles printklaar is.
          </p>
        )}
        {ready.length === 0 ? (
          <p className={empty}>Geen printklare orders zonder batch.</p>
        ) : (
          <ReadyOrdersPicker orders={ready} openBatches={openBatches.map((batch) => ({ id: batch.id, ref: batch.ref }))} />
        )}
      </section>

      <section className="mt-12">
        <h2 className={h2}>Nog niet naar JLC ({openBatches.length})</h2>
        {openBatches.length === 0 && <p className={empty}>Geen open batches.</p>}
        <div className="mt-4 flex flex-col gap-4">
          {openBatches.map((batch) => (
            <details key={batch.id} className="rounded-3xl bg-white p-6" open={openBatches.length === 1}>
              <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-display text-xl font-medium text-medium-green">{batch.ref}</span>
                <span className="text-sm text-text-muted">
                  {formatDateTime(batch.createdAt)} · {batch.createdBy} · {batch.counts.orders} orders · {batch.counts.palleys} Palleys ·{" "}
                  {batch.counts.copies} exemplaren
                </span>
              </summary>
              <div className="mt-5 flex flex-wrap items-start gap-3">
                <BatchZipButton batchId={batch.id} fileName={batchZipName(batch.ref)} />
                {batch.counts.orders > 0 && <BatchActionButton batchId={batch.id} action="send_to_jlc" />}
                {batch.counts.orders === 0 && <DeleteBatchButton batchId={batch.id} />}
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {batch.orders.map((order) => (
                  <BatchOrderCard key={order.id} order={order}>
                    <RemoveFromBatchButton batchId={batch.id} orderId={order.id} />
                  </BatchOrderCard>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
