import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { listCollectiblesForAdmin } from "@/core/modules/collectibles/service";
import { CollectibleForm } from "@/components/functional/admin/settings/CollectibleForm";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

export default async function NewCollectiblePage() {
  await requireAdminPage();
  const [collectibles, { catalog }] = await Promise.all([listCollectiblesForAdmin(), getShopSettings()]);
  const nextSortOrder = collectibles.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);
  return (
    <>
      <Link
        href="/admin/settings/collectibles"
        className="w-fit rounded font-label text-base font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
      >
        Terug naar collectibles
      </Link>
      <SettingsHeader title="Collectible toevoegen" />
      <CollectibleForm animals={catalog.animals} nextSortOrder={nextSortOrder} />
    </>
  );
}
