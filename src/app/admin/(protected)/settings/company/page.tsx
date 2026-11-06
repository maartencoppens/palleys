import { requireAdminPage } from "@/core/modules/auth/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { CompanySettingsForm } from "@/components/functional/admin/settings/CompanySettingsForm";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

export default async function AdminCompanySettingsPage() {
  await requireAdminPage();
  const { company } = await getShopSettings();
  return (
    <>
      <SettingsHeader title="Bedrijf & sociale media" />
      <CompanySettingsForm company={company} />
    </>
  );
}
