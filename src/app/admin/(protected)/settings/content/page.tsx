import { requireAdminPage } from "@/core/modules/auth/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { ContentSettingsForm } from "@/components/functional/admin/settings/ContentSettingsForm";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export default async function AdminContentSettingsPage() {
  await requireAdminPage();
  const { content } = await getShopSettings();
  return (
    <>
      <SettingsHeader title="Teksten" intro="Na opslaan meteen zichtbaar op de website." />
      <ContentSettingsForm content={content} />
    </>
  );
}
