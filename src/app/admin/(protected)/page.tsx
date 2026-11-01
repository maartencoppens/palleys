import Link from "next/link";
import { z } from "zod";
import { requireAdminPage } from "@/core/modules/auth/service";
import { listOrdersForCheckIn } from "@/core/modules/orders/service";
import { getAdminDashboard } from "@/core/modules/previews/service";
import { formatDateTime } from "@/core/utils/format";
import { StatCard } from "@/components/design/StatCard";
import Button from "@/components/design/Button";
import { Input } from "@/components/design/form";
import { OrderStatusBadge } from "@/components/functional/admin/OrderStatusBadge";
import { PreviewStatusBadge } from "@/components/functional/admin/PreviewStatusBadge";

const searchSchema = z.object({ q: z.string().max(200).optional() });

export default async function AdminDashboardPage({
  searchParams,
}: PageProps<"/admin">) {
  await requireAdminPage();
  const parsed = searchSchema.safeParse(await searchParams);
  const [{ stats, query, results }, openOrders] = await Promise.all([
    getAdminDashboard(parsed.success ? parsed.data.q : ""),
    listOrdersForCheckIn(),
  ]);

  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green">
          Check-in
        </h1>
        <Button variant="primary" href="/admin/orders/new">
          Order toevoegen
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Te reviewen"
          value={stats.toReview}
          href="/admin/review"
        />
        <StatCard
          label="Nog te downloaden"
          value={stats.toDownload}
          href="/admin/approved"
        />
        <StatCard
          label="Mislukt"
          value={stats.failed}
          href="/admin/review"
          tone="danger"
        />
        <StatCard
          label="Goedgekeurd (totaal)"
          value={stats.approved}
          href="/admin/approved"
        />
      </div>

      <section className="mt-10 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8">
        <h2 className="font-display text-2xl font-medium text-medium-green">
          Openstaande orders
        </h2>
        <p className="mt-1 text-base text-text-muted">
          Betaald en nog niet de deur uit, oudste eerst. Elk item wordt nagekeken voor het vertrekt.
        </p>
        {openOrders.length === 0 ? (
          <p className="mt-4 text-base text-text-muted">Niets open: alles is de deur uit.</p>
        ) : (
          <ul className="mt-4 divide-y divide-off-white-dark overflow-hidden rounded-2xl border-[1.5px] border-off-white-dark">
            {openOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-sm transition-colors hover:bg-off-white"
                >
                  <span className="font-semibold tabular-nums">{order.number}</span>
                  <OrderStatusBadge status={order.status} />
                  <span>{order.name}</span>
                  <span className="font-label font-bold text-medium-green sm:ml-auto">{order.nextStep}</span>
                  <span className="tabular-nums text-text-muted">
                    {order.summary.checked}/{order.summary.total} afgevinkt
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8">
        <h2 className="font-display text-2xl font-medium text-medium-green">
          Preview zoeken
        </h2>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            name="q"
            defaultValue={query}
            placeholder="Ordernummer, e-mail of preview-id"
            aria-label="Preview zoeken"
            className="h-12 sm:max-w-md md:h-14"
          />
          <Button type="submit" variant="primary">
            Zoeken
          </Button>
        </form>

        {query && results.length === 0 && (
          <p className="mt-4 text-base text-text-muted">
            Niets gevonden voor “{query}”.
          </p>
        )}

        {results.length > 0 && (
          <ul className="mt-4 divide-y divide-off-white-dark overflow-hidden rounded-2xl border-[1.5px] border-off-white-dark">
            {results.map((preview) => (
              <li key={preview.id}>
                <Link
                  href={`/admin/previews/${preview.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-sm transition-colors hover:bg-off-white"
                >
                  <span className="tabular-nums text-text-muted">
                    {formatDateTime(preview.createdAt)}
                  </span>
                  <PreviewStatusBadge status={preview.status} />
                  <span className="font-semibold">{preview.email ?? "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
