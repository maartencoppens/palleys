import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getProductionPage, listFinishedOrders } from "@/core/modules/batches/service";
import { finishedQuerySchema } from "@/core/modules/batches/types";
import type { BatchOrderView, ProductionBatchView } from "@/core/modules/batches/types";
import { finishedLabel } from "@/core/modules/batches/utils";
import { toLocale } from "@/core/locale/config";
import { batchZipName } from "@/core/utils/naming";
import { formatDateTime } from "@/core/utils/format";
import { Badge } from "@/components/design/Badge";
import { BatchOrderCard } from "@/components/functional/admin/batches/BatchOrderList";
import { BatchActionButton, BatchZipButton } from "@/components/functional/admin/batches/BatchButtons";
import { ItemCheckInButton } from "@/components/functional/admin/orders/ItemCheckInButton";
import {
  BpostDownload,
  FinishOrderForm,
  PickupUpdateForm,
  ReadyForPickupButton,
} from "@/components/functional/admin/production/ProductionActions";

export const instant = false;

const h1 = "font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green";
const h2 = "font-display text-xl font-medium text-medium-green";
const h3 = "font-label text-base font-bold";
const empty = "mt-4 rounded-3xl border-2 border-dashed border-medium-green/25 px-6 py-8 text-center text-base text-text-muted";
const OPEN = ["PAID", "IN_PRODUCTION"];

export default async function AdminProductionPage({ searchParams }: PageProps<"/admin/production">) {
  await requireAdminPage();
  const query = finishedQuerySchema.parse(await searchParams);
  const [{ sent, postProduction, waitingForPickup }, finished] = await Promise.all([
    getProductionPage(),
    listFinishedOrders(query.tab, query.page),
  ]);

  return (
    <main>
      <h1 className={h1}>Productie</h1>

      <section className="mt-8">
        <h2 className={h2}>Verzonden naar JLC ({sent.length})</h2>
        {sent.length === 0 && <p className={empty}>Er ligt niets bij JLC.</p>}
        <div className="mt-4 flex flex-col gap-4">
          {sent.map((batch) => (
            <details key={batch.id} className="rounded-3xl bg-white p-6">
              <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-display text-xl font-medium text-medium-green">{batch.ref}</span>
                <span className="text-sm text-text-muted">
                  verzonden {batch.sentToJlcAt && formatDateTime(batch.sentToJlcAt)} door {batch.sentToJlcBy} · {batch.counts.orders} orders ·{" "}
                  {batch.counts.copies} exemplaren
                </span>
              </summary>
              <div className="mt-5 flex flex-wrap items-start gap-3">
                <BatchActionButton batchId={batch.id} action="received" />
                <BatchZipButton batchId={batch.id} fileName={batchZipName(batch.ref)} />
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {batch.orders.map((order) => (
                  <BatchOrderCard key={order.id} order={order} />
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className={h2}>In postproductie ({postProduction.length})</h2>
        {postProduction.length === 0 && <p className={empty}>Geen batches in postproductie.</p>}
        <div className="mt-4 flex flex-col gap-6">
          {postProduction.map((batch) => (
            <PostProductionBatch key={batch.id} batch={batch} />
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-3xl bg-white p-6">
        <h2 className={h2}>Update voor wie nog moet afhalen ({waitingForPickup.length})</h2>
        <p className="mt-1 text-sm text-text-muted">
          Gaat naar elke klant van wie de bestelling klaarligt maar nog niet opgehaald is, in de taal van de order. Zo vaak als nodig.
        </p>
        {waitingForPickup.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {waitingForPickup.map((order) => (
              <li key={order.id}>
                <Link href={`/admin/orders/${order.id}`}>
                  <Badge>
                    {order.number} · {order.customerName}
                    {order.lastPickupUpdateAt ? ` · update ${formatDateTime(order.lastPickupUpdateAt)}` : ""}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <PickupUpdateForm
            recipients={waitingForPickup.length}
            needsEnglish={waitingForPickup.some((order) => toLocale(order.locale) === "en")}
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className={h2}>Afgerond</h2>
        <nav aria-label="Afgerond" className="mt-3 flex gap-4 font-label text-base font-bold">
          {(["delivered", "collected"] as const).map((tab) => (
            <Link
              key={tab}
              href={`/admin/production?tab=${tab}`}
              aria-current={finished.tab === tab ? "page" : undefined}
              className={finished.tab === tab ? "text-orange underline underline-offset-4" : "text-medium-green hover:text-orange"}
            >
              {tab === "delivered" ? "Geleverd" : "Opgehaald / overhandigd"}
            </Link>
          ))}
        </nav>
        {finished.orders.length === 0 ? (
          <p className={empty}>Nog niets afgerond.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-3xl bg-white">
            <table className="admin-table w-full text-left text-sm">
              <thead className="border-b-[1.5px] border-off-white-dark font-label text-text-muted">
                <tr>
                  <th className="px-5 py-4 font-semibold">Order</th>
                  <th className="px-5 py-4 font-semibold">Klant</th>
                  <th className="px-5 py-4 font-semibold">Batch</th>
                  {finished.tab === "delivered" ? (
                    <>
                      <th className="px-5 py-4 font-semibold">Verzonden</th>
                      <th className="px-5 py-4 font-semibold">Tracking</th>
                    </>
                  ) : (
                    <>
                      <th className="px-5 py-4 font-semibold">Klaargelegd</th>
                      <th className="px-5 py-4 font-semibold">Opgehaald</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {finished.orders.map((order) => (
                  <tr key={order.id} className="border-b border-off-white-dark last:border-0">
                    <td className="px-5 py-4">
                      <Link href={`/admin/orders/${order.id}`} className="font-label font-bold text-medium-green underline-offset-4 hover:underline">
                        {order.number}
                      </Link>{" "}
                      <Badge tone="success">{finishedLabel(order.deliveryType)}</Badge>
                    </td>
                    <td data-label="Klant" className="px-5 py-4">
                      {order.customerName}
                    </td>
                    <td data-label="Batch" className="px-5 py-4 font-mono text-xs">
                      {order.batchRef ?? "—"}
                    </td>
                    {finished.tab === "delivered" ? (
                      <>
                        <td data-label="Verzonden" className="whitespace-nowrap px-5 py-4 text-text-muted">
                          {order.shippedAt ? formatDateTime(order.shippedAt) : "—"}
                        </td>
                        <td data-label="Tracking" className="px-5 py-4 font-mono text-xs">
                          {order.trackingUrl ? (
                            <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="text-medium-green underline underline-offset-4">
                              {order.trackingCode ?? "Volgen"}
                            </a>
                          ) : (
                            (order.trackingCode ?? "—")
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td data-label="Klaargelegd" className="whitespace-nowrap px-5 py-4 text-text-muted">
                          {order.readyForPickupAt ? formatDateTime(order.readyForPickupAt) : "—"}
                        </td>
                        <td data-label="Opgehaald" className="whitespace-nowrap px-5 py-4 text-text-muted">
                          {order.shippedAt ? formatDateTime(order.shippedAt) : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {finished.pageCount > 1 && (
          <nav aria-label="Pagina's" className="mt-4 flex items-center gap-4 font-label text-sm font-bold">
            {finished.page > 1 && (
              <Link href={`/admin/production?tab=${finished.tab}&page=${finished.page - 1}`} className="text-medium-green underline underline-offset-4">
                Vorige
              </Link>
            )}
            <span className="text-text-muted">
              Pagina {finished.page} van {finished.pageCount}
            </span>
            {finished.page < finished.pageCount && (
              <Link href={`/admin/production?tab=${finished.tab}&page=${finished.page + 1}`} className="text-medium-green underline underline-offset-4">
                Volgende
              </Link>
            )}
          </nav>
        )}
      </section>
    </main>
  );
}

const checkIn = (order: BatchOrderView) =>
  function CheckIn(item: BatchOrderView["items"][number]) {
    if (!OPEN.includes(order.status)) return null;
    return <ItemCheckInButton orderId={order.id} itemId={item.id} stage={item.checkedInAt ? "checked" : "ready"} />;
  };

function PostProductionBatch({ batch }: { batch: ProductionBatchView }) {
  const deliver = batch.orders.filter((order) => order.group === "deliver");
  const pickup = batch.orders.filter((order) => order.group === "pickup");
  const other = batch.orders.filter((order) => order.group === "other");
  const open = (order: BatchOrderView) => OPEN.includes(order.status);

  return (
    <div className="rounded-3xl bg-white p-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-display text-xl font-medium text-medium-green">{batch.ref}</span>
        <span className="text-sm text-text-muted">
          terug van JLC {batch.receivedAt && formatDateTime(batch.receivedAt)} · {batch.counts.orders} orders
        </span>
      </div>

      {other.length > 0 && (
        <div role="alert" className="mt-4 rounded-2xl bg-pink p-4 text-sm text-[#a3341a]">
          Deze orders hebben een leveringstype dat hier niet hoort: {other.map((order) => `${order.number} (${order.deliveryType ?? "geen"})`).join(", ")}.
          Bekijk ze op de orderpagina.
        </div>
      )}

      <div className="mt-6 grid gap-8 xl:grid-cols-2">
        <section aria-label="Leveren met bpost" className="flex flex-col gap-4">
          <h3 className={h3}>Leveren (bpost) · {deliver.length}</h3>
          {deliver.length > 0 && (
            <>
              <BpostDownload batchId={batch.id} labels={batch.bpostLabels} problems={batch.bpostProblems} />
              <BatchActionButton batchId={batch.id} action="ship_all_deliveries" variant="secondary" />
            </>
          )}
          {deliver.map((order) => (
            <BatchOrderCard key={order.id} order={order} itemActions={checkIn(order)}>
              {order.address && <p className="text-sm">{order.address}</p>}
              {open(order) ? (
                <FinishOrderForm orderId={order.id} deliveryType={order.deliveryType} disabled={!order.allCheckedIn} />
              ) : (
                <Badge tone="success">{finishedLabel(order.deliveryType)}{order.trackingCode ? ` · ${order.trackingCode}` : ""}</Badge>
              )}
            </BatchOrderCard>
          ))}
        </section>

        <section aria-label="Afhalen" className="flex flex-col gap-4">
          <h3 className={h3}>Afhalen · {pickup.length}</h3>
          {pickup.map((order) => (
            <BatchOrderCard key={order.id} order={order} itemActions={checkIn(order)}>
              <p className="text-sm">
                {order.deliveryLabel}
                <br />
                <span className="text-text-muted">{[order.email, order.phone].filter(Boolean).join(" · ")}</span>
              </p>
              {open(order) ? (
                <div className="flex flex-wrap items-start gap-3">
                  {order.deliveryType === "PICKUP" &&
                    (order.readyForPickupAt ? (
                      <Badge tone="waiting">Klaargelegd {formatDateTime(order.readyForPickupAt)}</Badge>
                    ) : (
                      <ReadyForPickupButton orderId={order.id} disabled={!order.allCheckedIn} />
                    ))}
                  <FinishOrderForm orderId={order.id} deliveryType={order.deliveryType} disabled={!order.allCheckedIn} />
                </div>
              ) : (
                <Badge tone="success">{finishedLabel(order.deliveryType)}</Badge>
              )}
            </BatchOrderCard>
          ))}
        </section>
      </div>
    </div>
  );
}
