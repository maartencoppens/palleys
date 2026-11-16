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
      <SettingsHeader
        title="Verzending"
        intro="Hoe we leveren, en wat het de klant kost, per land. In de checkout kiest de klant eerst het land; daarna ziet hij de opties en prijzen van dat land. Een nieuw land staat uit tot je de prijs controleert en een optie aanvinkt."
      />
      <ShippingSettingsForm settings={settings} />
    </>
  );
}
