import { requireAdminPage } from "@/core/modules/auth/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { CatalogSettingsForm } from "@/components/functional/admin/settings/CatalogSettingsForm";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

export default async function AdminProductSettingsPage() {
  await requireAdminPage();
  const { catalog } = await getShopSettings();
  return (
    <>
      <SettingsHeader
        title="Gepersonaliseerde Palley"
        intro="De sleutelhanger of het figuurtje dat we op maat maken van de foto van de klant."
      />
      <CatalogSettingsForm settings={catalog} />
    </>
  );
}
