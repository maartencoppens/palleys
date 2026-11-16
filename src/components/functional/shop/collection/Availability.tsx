import { fill } from "@/core/locale/fill";
import { getMessages } from "@/core/locale/server";
import InfoTip from "./InfoTip";

/*
 * Delivery tag of a collectible: "3 in stock" when there are finished copies on the shelf, otherwise made to order.
 * The explanation opens on hover, and on tap for phones (InfoTip).
 */
export default async function Availability({ stock = null }: { stock?: number | null }) {
  const { collection } = await getMessages();
  const m = collection.availability;
  const inStock = stock !== null && stock > 0;
  const label = inStock ? fill(m.inStock, { count: stock ?? 0 }) : m.label;
  const explanation = inStock ? m.inStockExplanation : m.explanation;
  return (
    <span
      className={`relative z-20 inline-flex w-fit items-center gap-1.5 rounded-pill px-s py-1 text-sm leading-[21px] text-text-primary ${inStock ? "bg-light-green" : "bg-light-yellow"}`}
    >
      {label}
      <InfoTip label={label} explanation={explanation} />
    </span>
  );
}
