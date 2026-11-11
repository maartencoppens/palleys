import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getFinanceOverview } from "@/core/modules/finance/service";
import { financeQuerySchema, type FinanceBreakdownRow } from "@/core/modules/finance/types";
import { InvalidRangeError } from "@/core/modules/finance/utils";
import { ORDER_STATUSES } from "@/core/modules/orders/types";
import { formatDateTime, formatPrice } from "@/core/utils/format";
import Button from "@/components/design/Button";
import { Badge } from "@/components/design/Badge";
import { Input } from "@/components/design/form";
import { OrderStatusBadge, orderStatusLabel } from "@/components/functional/admin/OrderStatusBadge";
import { JournalCopyButtons } from "@/components/functional/admin/finance/JournalCopyButtons";
import { RevenueChart } from "@/components/functional/admin/finance/RevenueChart";
import { compactFieldClassName, fieldLabelClassName } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

const selectClassName =
  "h-11 w-full rounded-[15px] bg-off-white-dark px-4 font-label text-base font-semibold text-medium-green outline-none focus-visible:ring-3 focus-visible:ring-accent-highlights";
const cardClassName = "rounded-3xl bg-white p-4 sm:p-6";
const euro = (cents: number) => formatPrice(cents / 100);
const percent = (share: number) => `${Math.round(share * 100)}%`;

/*
 * The money side of the shop for a period: what came in (and went back), how, through which channel and for what, what
 * is still open, and the orders behind it. Test and live payments are never mixed. The sales journal for our Excel is
 * copied from here too.
 */
export default async function AdminFinancePage({ searchParams }: PageProps<"/admin/finance">) {
  await requireAdminPage();
  const parsed = financeQuerySchema.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : financeQuerySchema.parse({});
  let overview;
  let rangeError: string | null = parsed.success ? null : "Ongeldige filter: de standaardperiode wordt getoond";
  try {
    overview = await getFinanceOverview(query);
  } catch (error) {
    if (!(error instanceof InvalidRangeError)) throw error;
    rangeError = error.message;
    overview = await getFinanceOverview(financeQuerySchema.parse({ mode: query.mode }));
  }
  const { summary, open } = overview;
  const filters = overview.query;

  const cards = [
    { label: "Netto ontvangen", value: euro(summary.netCents), note: "Ontvangen min terugbetalingen en chargebacks" },
    { label: "Bruto ontvangen", value: euro(summary.grossCents), note: `${summary.moneyOrders} betaalde orders` },
    { label: "Gemiddelde orderwaarde", value: euro(summary.averageOrderCents), note: "Alleen orders met geld" },
    {
      label: "Terugbetaald",
      value: euro(summary.refundedCents),
      note: summary.chargebackCents ? `+ ${euro(summary.chargebackCents)} chargebacks` : "Geen chargebacks",
      danger: summary.chargebackCents > 0,
    },
    { label: "Productomzet", value: euro(summary.productCents), note: "Na korting, zonder verzending" },
    { label: "Verzendkosten", value: euro(summary.shippingCents), note: "Betaald door klanten" },
    { label: "Kortingen", value: euro(summary.discountCents), note: `${summary.discountOrders} orders met een code` },
    { label: "Zonder betaling", value: String(summary.freeOrders), note: "Geschenk of gratis met kortingscode" },
  ];

  return (
    <main>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green">Financieel</h1>
        {filters.mode === "test" && <Badge tone="waiting">Testbetalingen</Badge>}
      </div>
      <p className="mt-1 text-sm text-text-muted">
        Op betaaldag, Belgische tijd. Voorraadorders tellen niet mee. Stripe-kosten staan hier niet in.
      </p>

      <form className="mt-6 grid grid-cols-2 gap-3 rounded-3xl bg-white p-4 sm:p-6 md:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end">
        <label className="flex flex-col gap-2">
          <span className={fieldLabelClassName}>Van</span>
          <Input type="date" name="from" defaultValue={filters.from} className={compactFieldClassName} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={fieldLabelClassName}>Tot en met</span>
          <Input type="date" name="to" defaultValue={filters.to} className={compactFieldClassName} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={fieldLabelClassName}>Betalingen</span>
          <select name="mode" defaultValue={filters.mode} className={selectClassName}>
            <option value="live">Live (echt geld)</option>
            <option value="test">Test (Stripe-testmodus)</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={fieldLabelClassName}>Betaalmethode</span>
          <select name="method" defaultValue={filters.method ?? ""} className={selectClassName}>
            <option value="">Alle</option>
            {overview.methods.map((method) => (
              <option key={method.key} value={method.key}>
                {method.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={fieldLabelClassName}>Huidige status</span>
          <select name="status" defaultValue={filters.status ?? ""} className={selectClassName}>
            <option value="">Alle</option>
            {ORDER_STATUSES.filter((status) => status !== "PENDING_PAYMENT").map((status) => (
              <option key={status} value={status}>
                {orderStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="primary">
          Toon
        </Button>
      </form>
      {rangeError && (
        <p role="alert" className="mt-3 text-sm text-[#a3341a]">
          {rangeError}
        </p>
      )}

      <section aria-label="Kerncijfers" className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className={cardClassName}>
            <p className="font-label text-sm font-semibold text-text-muted">{card.label}</p>
            <p className={`mt-2 font-display text-2xl font-medium tabular-nums sm:text-3xl ${card.danger ? "text-[#a3341a]" : "text-medium-green"}`}>
              {card.value}
            </p>
            <p className="mt-1 text-xs text-text-muted">{card.note}</p>
          </div>
        ))}
      </section>

      <section aria-label="Openstaand" className="mt-4 flex flex-wrap gap-x-6 gap-y-2 rounded-3xl bg-white p-4 text-sm sm:p-6">
        <span className="font-label font-semibold text-text-muted">Nu openstaand (los van de periode):</span>
        <Link href="/admin/orders?status=PENDING_PAYMENT" className="font-semibold text-medium-green underline underline-offset-4 hover:text-orange">
          {open.pendingOrders} wachten op betaling ({euro(open.pendingCents)})
        </Link>
        <Link
          href="/admin/orders?status=ATTENTION"
          className={`font-semibold underline underline-offset-4 hover:text-orange ${open.attentionOrders > 0 ? "text-[#a3341a]" : "text-medium-green"}`}
        >
          {open.attentionOrders} met een probleem
        </Link>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RevenueChart series={summary.series} granularity={summary.granularity} />
        <div className="space-y-6">
          <Breakdown title="Per betaalmethode" rows={summary.byMethod} countLabel="orders" />
          <Breakdown title="Per kanaal" rows={summary.byChannel} countLabel="orders" />
          <Breakdown title="Per product" rows={summary.byProduct} countLabel="stuks" note="Voor korting, zonder verzending" />
        </div>
      </div>

      <section className={`${cardClassName} mt-6`} aria-labelledby="journal-title">
        <h2 id="journal-title" className="font-display text-xl font-medium text-medium-green">
          Verkoopdagboek
        </h2>
        <p className="mt-1 mb-4 text-sm text-text-muted">
          {filters.from} tot en met {filters.to}, {filters.mode}. Tab-gescheiden met kopregel: plak rechtstreeks in Excel. De filters op
          methode en status gelden hier niet.
        </p>
        <JournalCopyButtons from={filters.from} to={filters.to} mode={filters.mode} />
      </section>

      <section className="mt-6" aria-labelledby="orders-title">
        <h2 id="orders-title" className="font-display text-xl font-medium text-medium-green">
          Orders ({summary.paidOrders})
        </h2>
        {overview.ordersTruncated && <p className="mt-1 text-sm text-text-muted">De nieuwste 300; de cijfers hierboven tellen alles.</p>}
        <div className="mt-3 overflow-x-auto rounded-3xl bg-white">
          <table className="w-full min-w-[56rem] text-left text-sm tabular-nums">
            <thead className="text-text-muted">
              <tr>
                {["Betaald op", "Order", "Factuur", "Klant", "Methode", "Status", "Totaal", "Ontvangen", "Terug"].map((label, index) => (
                  <th key={label} className={`px-4 py-3 font-label font-semibold ${index >= 6 ? "text-right" : ""}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overview.orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-text-muted">
                    Geen betaalde orders in deze periode.
                  </td>
                </tr>
              )}
              {overview.orders.map((order) => (
                <tr key={order.id} className="border-t border-medium-green/10">
                  <td className="px-4 py-2">{order.paidAt ? formatDateTime(order.paidAt) : "—"}</td>
                  <td className="px-4 py-2">
                    <Link href={`/admin/orders/${order.id}`} className="font-semibold text-medium-green underline underline-offset-4 hover:text-orange">
                      {order.number}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{order.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-2">{order.name}</td>
                  <td className="px-4 py-2">
                    {order.method}
                    {order.manual && <span className="text-text-muted"> · manueel</span>}
                  </td>
                  <td className="px-4 py-2">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-2 text-right">{euro(order.totalCents)}</td>
                  <td className="px-4 py-2 text-right">{euro(order.receivedCents)}</td>
                  <td className={`px-4 py-2 text-right ${order.chargedBackCents ? "text-[#a3341a]" : ""}`}>
                    {order.refundedCents || order.chargedBackCents ? euro(order.refundedCents + order.chargedBackCents) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Breakdown({ title, rows, countLabel, note }: { title: string; rows: FinanceBreakdownRow[]; countLabel: string; note?: string }) {
  return (
    <section className={cardClassName}>
      <h2 className="font-display text-lg font-medium text-medium-green">{title}</h2>
      {note && <p className="text-xs text-text-muted">{note}</p>}
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">Niets in deze periode.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((row) => (
            <li key={row.key} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{row.label}</span>
                <span className="tabular-nums">{euro(row.cents)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-off-white-dark">
                  <div className="h-full rounded-full bg-medium-green" style={{ width: percent(row.share) }} />
                </div>
                <span className="w-24 text-right text-xs text-text-muted tabular-nums">
                  {row.count} {countLabel} · {percent(row.share)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
