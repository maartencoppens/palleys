import { fill } from "@/core/locale/fill";
import { getMessages } from "@/core/locale/server";

/*
 * Delivery tag of a collectible: "3 in stock" when there are finished copies on the shelf, otherwise made to order.
 * The explanation opens on hover, and on tap or keyboard focus for phones.
 */
export default async function Availability({ stock = null }: { stock?: number | null }) {
  const { collection } = await getMessages();
  const m = collection.availability;
  const inStock = stock !== null && stock > 0;
  const label = inStock ? fill(m.inStock, { count: stock ?? 0 }) : m.label;
  const explanation = inStock ? m.inStockExplanation : m.explanation;
  return (
    <span
      className={`group relative z-20 inline-flex w-fit items-center gap-1.5 rounded-pill px-s py-1 text-sm leading-[21px] text-text-primary ${inStock ? "bg-light-green" : "bg-light-yellow"}`}
    >
      {label}
      <button
        type="button"
        aria-label={`${label}: ${explanation}`}
        className="grid size-5 place-items-center rounded-full bg-medium-green font-label text-xs font-bold text-off-white"
      >
        <span aria-hidden>i</span>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 hidden w-max max-w-56 rounded-xl bg-medium-green px-3 py-1.5 text-sm text-off-white group-hover:block group-focus-within:block"
      >
        {explanation}
      </span>
    </span>
  );
}
