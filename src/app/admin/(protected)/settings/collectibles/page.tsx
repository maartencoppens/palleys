import Image from "next/image";
import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { listCollectiblesForAdmin } from "@/core/modules/collectibles/service";
import type { AdminCollectible } from "@/core/modules/collectibles/types";
import { formatPrice } from "@/core/utils/format";
import { Badge } from "@/components/design/Badge";
import Button from "@/components/design/Button";
import { CollectibleActions } from "@/components/functional/admin/settings/CollectibleActions";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export default async function AdminCollectiblesPage() {
  await requireAdminPage();
  const collectibles = await listCollectiblesForAdmin();
  const active = collectibles.filter((collectible) => !collectible.archivedAt);
  const archived = collectibles.filter((collectible) => collectible.archivedAt);

  return (
    <>
      <SettingsHeader
        title="Collectibles"
        intro="Kant-en-klare modellen die klanten zo kunnen kopen, zonder foto. Ze slaan de AI-pipeline over en staan op /shop en de homepage."
        action={
          <Button variant="primary" href="/admin/settings/collectibles/new">
            Collectible toevoegen
          </Button>
        }
      />

      {active.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-medium-green/25 px-6 py-16 text-center">
          <p className="font-display text-2xl font-medium text-medium-green">Nog geen collectibles.</p>
          <p className="mt-2 text-base text-text-muted">Voeg de eerste toe; hij staat meteen op de website.</p>
        </div>
      ) : (
        <CollectibleTable collectibles={active} />
      )}

      {archived.length > 0 && (
        <section>
          <h3 className="font-display text-2xl font-medium text-medium-green">Verwijderd</h3>
          <p className="mt-1 text-sm text-text-muted">Niet meer op de website. Oude orders verwijzen er nog naar.</p>
          <div className="mt-4">
            <CollectibleTable collectibles={archived} />
          </div>
        </section>
      )}
    </>
  );
}

function CollectibleTable({ collectibles }: { collectibles: AdminCollectible[] }) {
  return (
    <div className="overflow-x-auto rounded-3xl bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b-[1.5px] border-off-white-dark font-label text-text-muted">
          <tr>
            <th className="px-5 py-4 font-semibold">Product</th>
            <th className="px-5 py-4 font-semibold">Status</th>
            <th className="px-5 py-4 text-right font-semibold">Prijs</th>
            <th className="px-5 py-4 text-right font-semibold">Verkocht</th>
            <th className="px-5 py-4">
              <span className="sr-only">Acties</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {collectibles.map((collectible) => (
            <tr key={collectible.id} className="border-b border-off-white-dark last:border-0 hover:bg-off-white/60">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-light-green">
                    {collectible.imageUrl && (
                      <Image src={collectible.imageUrl} alt="" fill sizes="56px" className="object-contain p-1" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{collectible.name}</p>
                    <p className="font-mono text-xs text-text-muted">{collectible.sku}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {collectible.archivedAt ? (
                    <Badge>Verwijderd</Badge>
                  ) : collectible.published ? (
                    <Badge tone="success">Op de website</Badge>
                  ) : (
                    <Badge tone="waiting">Verborgen</Badge>
                  )}
                  {collectible.soldOut && !collectible.archivedAt && <Badge tone="danger">Uitverkocht</Badge>}
                </div>
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums">
                {formatPrice(collectible.priceCents / 100)}
              </td>
              <td className="px-5 py-3 text-right tabular-nums">{collectible.orderedQuantity}</td>
              <td className="whitespace-nowrap px-5 py-3 text-right">
                <div className="flex justify-end gap-4">
                  {!collectible.archivedAt && (
                    <Link
                      href={`/admin/settings/collectibles/${collectible.id}`}
                      className="rounded font-label font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
                    >
                      Bewerken
                    </Link>
                  )}
                  <CollectibleActions id={collectible.id} name={collectible.name} archived={Boolean(collectible.archivedAt)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
