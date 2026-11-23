import { addonByLabel } from "@/data/addons";

/*
 * The extras on an order or a Palley (a Santa hat…) as eye-catching badges, so nobody misses that this one is made
 * differently. Takes the labels the backoffice services give (addonLabels); renders nothing without extras.
 */
export function AddonBadges({ labels }: { labels: readonly string[] }) {
  if (labels.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1.5 align-middle">
      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-coral px-3 py-1 font-label text-xs font-bold text-off-white"
        >
          <span aria-hidden>★</span>
          {label}
        </span>
      ))}
    </span>
  );
}

/*
 * On a Palley's review page: which extras the customer paid for, that they're in the pose prompt, and what to check on
 * the pose and the model before approving.
 */
export function AddonCheck({ labels }: { labels: readonly string[] }) {
  if (labels.length === 0) return null;
  return (
    <section className="rounded-3xl bg-coral/15 p-6 ring-2 ring-coral ring-inset">
      <h2 className="font-display text-xl font-medium text-medium-green">Extra besteld</h2>
      <p className="mt-2">
        <AddonBadges labels={labels} />
      </p>
      <p className="mt-3 text-sm">Zit automatisch in de prompt van elke nieuwe pose. Controleer vóór je goedkeurt:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {labels.map((label) => (
          <li key={label}>{addonByLabel(label)?.check ?? `${label} staat op de pose en het model.`}</li>
        ))}
      </ul>
    </section>
  );
}
