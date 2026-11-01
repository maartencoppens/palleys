import { requireAdminPage } from "@/core/modules/auth/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { OrderingSettingsForm } from "@/components/functional/admin/settings/OrderingSettingsForm";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export default async function AdminSettingsPage() {
  await requireAdminPage();
  const settings = await getShopSettings();
  return (
    <>
      <SettingsHeader title="Bestellen" intro="Of klanten via de website kunnen bestellen." />
      <OrderingSettingsForm settings={settings} />
      {settings.updatedBy && settings.updatedAt && (
        <p className="text-sm text-text-muted">
          Instellingen laatst aangepast door {settings.updatedBy} op {new Date(settings.updatedAt).toLocaleString("nl-BE")}
        </p>
      )}
    </>
  );
}
