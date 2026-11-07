import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { GenerateCollectibleForm } from "@/components/functional/admin/settings/GenerateCollectibleForm";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

export default async function GenerateCollectiblePage() {
  await requireAdminPage();
  const { prompts, catalog } = await getShopSettings();
  return (
    <>
      <Link
        href="/admin/settings/collectibles"
        className="w-fit rounded font-label text-base font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
      >
        Terug naar collectibles
      </Link>
      <SettingsHeader
        title="Nieuw model genereren"
        intro="Een nieuwe collectible, los van een order. Het model gaat door dezelfde pipeline als bij een klant (pose, 3D-model, goedkeuren, Blender). Zodra de printklare zip op Processed staat, komt hij vanzelf op de collectible; die staat al klaar, verborgen, om een naam en prijs te geven."
      />
      <GenerateCollectibleForm prompts={prompts} animals={catalog.animals} />
    </>
  );
}
