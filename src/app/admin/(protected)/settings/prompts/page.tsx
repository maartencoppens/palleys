import { requireAdminPage } from "@/core/modules/auth/service";
import { DEFAULT_PROMPTS, getShopSettings } from "@/core/modules/settings/service";
import { PromptSettingsForm } from "@/components/functional/admin/settings/PromptSettingsForm";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

export default async function AdminPromptSettingsPage() {
  await requireAdminPage();
  const { prompts, catalog } = await getShopSettings();
  return (
    <>
      <SettingsHeader
        title="AI-prompt"
        intro="De instructies voor Nano Banana, die van de foto's van de klant een pose maakt. Een wijziging geldt voor de volgende pose die je genereert."
      />
      <PromptSettingsForm prompts={prompts} defaults={DEFAULT_PROMPTS} animals={catalog.animals} />
    </>
  );
}
