import { requireAdminPage } from "@/core/modules/auth/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";
import { ShippingSettingsForm } from "@/components/functional/admin/settings/ShippingSettingsForm";

export const instant = false;

export default async function AdminShippingSettingsPage() {
  await requireAdminPage();
  const settings = await getShopSettings();
  return (
    <>
      <SettingsHeader title="Verzending" intro="Hoe we leveren, en wat het de klant kost." />
      <ShippingSettingsForm settings={settings} />
    </>
  );
}
