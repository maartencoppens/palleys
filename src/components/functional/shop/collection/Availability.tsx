import { getMessages } from "@/core/locale/server";

/* Delivery tag of a collectible: everything is made to order until there is real stock. The explanation opens on hover, and on tap or keyboard focus for phones. */
export default async function Availability() {
  const { collection } = await getMessages();
  const { label, explanation } = collection.availability;
  return (
    <span className="group relative inline-flex w-fit items-center gap-1.5 rounded-pill bg-light-yellow px-s py-1 text-sm leading-[21px] text-text-primary">
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
