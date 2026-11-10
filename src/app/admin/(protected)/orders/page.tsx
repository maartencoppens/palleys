import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getOrderStatsForAdmin, listOrdersForAdmin } from "@/core/modules/orders/service";
import { ORDER_STATUSES, orderListQuerySchema } from "@/core/modules/orders/types";
import { formatDateTime, formatPrice } from "@/core/utils/format";
import Button from "@/components/design/Button";
import { Badge } from "@/components/design/Badge";
import { Input } from "@/components/design/form";
import { OrderStatusBadge, orderStatusLabel, PaymentStatusBadge } from "@/components/functional/admin/OrderStatusBadge";

export const instant = false;

const FILTERS = [
  { value: "", label: "Alle" },
  { value: "ATTENTION", label: "Probleem" },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: orderStatusLabel(status) })),
];

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdminPage();
  const parsed = orderListQuerySchema.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : {};
  const [orders, stats] = await Promise.all([listOrdersForAdmin(query), getOrderStatsForAdmin()]);

  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green">
          Orders
        </h1>
        <Button variant="primary" href="/admin/orders/new">
          Order toevoegen
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: "Betaald vandaag", value: String(stats.paidToday) },
          { label: "Omzet vandaag", value: formatPrice(stats.revenueTodayCents / 100) },
          { label: "Wacht op betaling", value: String(stats.pending) },
          { label: "Met probleem", value: String(stats.attention), danger: stats.attention > 0 },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl bg-white p-4 sm:p-6">
            <p className="font-label text-sm font-semibold text-text-muted">{card.label}</p>
            <p
              className={`mt-2 font-display text-3xl font-medium tabular-nums sm:text-4xl ${card.danger ? "text-[#a3341a]" : "text-medium-green"}`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <form className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Ordernummer, e-mail, naam of notitie"
          aria-label="Orders zoeken"
          className="h-12 bg-white text-base! sm:max-w-md md:h-14 md:text-lg!"
        />
        {query.status && <input type="hidden" name="status" value={query.status} />}
        <Button type="submit" variant="primary">
          Zoeken
        </Button>
      </form>

      <nav aria-label="Filter op status" className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = (query.status ?? "") === filter.value;
          const params = new URLSearchParams();
          if (filter.value) params.set("status", filter.value);
          if (query.q) params.set("q", query.q);
          return (
            <Link
              key={filter.value || "all"}
              href={`/admin/orders${params.size ? `?${params}` : ""}`}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border-[1.5px] px-4 py-1.5 font-label text-sm font-bold transition-colors ${
                active ? "border-medium-green bg-medium-green text-off-white" : "border-medium-green/30 bg-white text-medium-green hover:bg-off-white"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-medium-green/25 px-6 py-16 text-center">
          <p className="font-display text-2xl font-medium text-medium-green">Geen orders gevonden.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl bg-white">
          <table className="admin-table w-full text-left text-sm">
            <thead className="border-b-[1.5px] border-off-white-dark font-label text-text-muted">
              <tr>
                <th className="px-5 py-4 font-semibold">Order</th>
                <th className="px-5 py-4 font-semibold">Datum</th>
                <th className="px-5 py-4 font-semibold">Klant</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Betaling</th>
                <th className="px-5 py-4 text-right font-semibold">Totaal</th>
                <th className="px-5 py-4">
                  <span className="sr-only">Actie</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-off-white-dark last:border-0 hover:bg-off-white/60">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold tabular-nums">
                    {order.number}
                    {order.attention && (
                      <span className="ml-2">
                        <Badge tone="danger">Probleem</Badge>
                      </span>
                    )}
                    {order.createdBy && (
                      <span className="ml-2" title={`Toegevoegd door ${order.createdBy}`}>
                        <Badge>Handmatig</Badge>
                      </span>
                    )}
                  </td>
                  <td data-label="Datum" className="whitespace-nowrap px-5 py-4 tabular-nums">{formatDateTime(order.createdAt)}</td>
                  <td data-label="Klant" className="px-5 py-4">
                    <span className="font-semibold">{order.name}</span>
                    {order.email && <span className="block text-text-muted">{order.email}</span>}
                  </td>
                  <td data-label="Status" className="px-5 py-4">
                    <OrderStatusBadge status={order.status} deliveryType={order.deliveryType} />
                  </td>
                  <td data-label="Betaling" className="whitespace-nowrap px-5 py-4">
                    {order.paymentStatus ? <PaymentStatusBadge status={order.paymentStatus} /> : "—"}
                    {order.paymentMode === "test" && <span className="ml-2 text-xs text-text-muted">test</span>}
                  </td>
                  <td data-label="Totaal" className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums">
                    {formatPrice(order.totalCents / 100)}
                    <span className="block text-xs font-normal text-text-muted">
                      {order.itemCount} {order.itemCount === 1 ? "Palley" : "Palleys"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
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
      )}
    </main>
  );
}
