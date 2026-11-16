import Link from "next/link";
import { z } from "zod";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { getCollectibleForAdmin } from "@/core/modules/collectibles/service";
import { GenerateCollectibleForm } from "@/components/functional/admin/settings/GenerateCollectibleForm";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

const searchSchema = z.object({ collectible: z.uuid().optional().catch(undefined) });

export default async function GenerateCollectiblePage({ searchParams }: PageProps<"/admin/settings/collectibles/generate">) {
  await requireAdminPage();
  const { collectible: collectibleId } = searchSchema.parse(await searchParams);
  const [{ prompts, catalog }, collectible] = await Promise.all([
    getShopSettings(),
    collectibleId ? getCollectibleForAdmin(collectibleId) : Promise.resolve(null),
  ]);
  const existing = collectible && !collectible.archivedAt ? collectible : null;
  return (
    <>
      <Link
        href={existing ? `/admin/settings/collectibles/${existing.id}` : "/admin/settings/collectibles"}
        className="w-fit rounded font-label text-base font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
      >
        {existing ? `Terug naar ${existing.name}` : "Terug naar collectibles"}
      </Link>
      {existing ? (
        <SettingsHeader
          title={`Nieuw model voor ${existing.name}`}
          intro="Voor deze collectible, er komt geen nieuwe bij. Het model gaat door dezelfde pipeline als bij een klant (pose, 3D-model, goedkeuren, Blender). Zodra de printklare zip op Processed staat, komt hij als nieuwe versie bij de collectible; daar kies je welk model bestellingen gebruiken."
        />
      ) : (
        <SettingsHeader
          title="Nieuw model genereren"
          intro="Een nieuwe collectible, los van een order. Het model gaat door dezelfde pipeline als bij een klant (pose, 3D-model, goedkeuren, Blender). Zodra de printklare zip op Processed staat, komt hij vanzelf op de collectible; die staat al klaar, verborgen, om een naam en prijs te geven. Een nieuw model voor een bestaande collectible start je op de pagina van die collectible."
        />
      )}
      <GenerateCollectibleForm
        prompts={prompts}
        animals={catalog.animals}
        collectible={existing ? { id: existing.id, animalCode: existing.animalCode } : null}
      />
    </>
  );
}
