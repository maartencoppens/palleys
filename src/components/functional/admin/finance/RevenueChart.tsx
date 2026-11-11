import { formatPrice } from "@/core/utils/format";
import type { FinanceSummary } from "@/core/modules/finance/types";

const GRANULARITY_LABELS = { day: "per dag", week: "per week", month: "per maand" } as const;

/*
 * Revenue per day, week or month: one series, so one hue and no legend (the title names it). Thin bars with a rounded
 * top on a recessive baseline, a gap between bars, a tooltip per bar on hover or focus, and the same numbers as a table
 * for screen readers and anyone who wants them exact.
 */
export function RevenueChart({ series, granularity }: Pick<FinanceSummary, "series" | "granularity">) {
  const max = Math.max(...series.map((bucket) => bucket.cents), 0);
  const labelEvery = Math.max(1, Math.ceil(series.length / 8));
  return (
    <figure className="rounded-3xl bg-white p-4 sm:p-6">
      <figcaption className="font-display text-xl font-medium text-medium-green">Omzet {GRANULARITY_LABELS[granularity]}</figcaption>
      <p className="mt-1 text-sm text-text-muted">Ontvangen geld op de betaaldag. Hoogste: {formatPrice(max / 100)}</p>
      <div className="mt-6 flex h-48 items-end gap-0.5 border-b border-medium-green/20" aria-hidden="true">
        {series.map((bucket) => (
          <div key={bucket.start} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
            <div
              className="w-full max-w-6 rounded-t-[4px] bg-medium-green transition-opacity group-hover:opacity-80"
              style={{ height: max > 0 ? `${Math.max((bucket.cents / max) * 100, bucket.cents > 0 ? 1 : 0)}%` : "0%" }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-xl bg-text-primary px-3 py-2 text-xs whitespace-nowrap text-off-white shadow-lg group-hover:block">
              <span className="font-bold">{bucket.label}</span>
              <br />
              {formatPrice(bucket.cents / 100)} · {bucket.count} {bucket.count === 1 ? "order" : "orders"}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-0.5 text-[11px] text-text-muted tabular-nums" aria-hidden="true">
        {series.map((bucket, index) => (
          <span key={bucket.start} className="min-w-0 flex-1 truncate text-center">
            {index % labelEvery === 0 ? bucket.label : ""}
          </span>
        ))}
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-label font-semibold text-medium-green">Als tabel</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead>
            <tr className="text-text-muted">
              <th className="py-1 font-semibold">Periode</th>
              <th className="py-1 text-right font-semibold">Orders</th>
              <th className="py-1 text-right font-semibold">Omzet</th>
            </tr>
          </thead>
          <tbody>
            {series.map((bucket) => (
              <tr key={bucket.start} className="border-t border-medium-green/10">
                <td className="py-1">{bucket.label}</td>
                <td className="py-1 text-right">{bucket.count}</td>
                <td className="py-1 text-right">{formatPrice(bucket.cents / 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
