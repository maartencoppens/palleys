import { cookies } from "next/headers";
import { requireAdminPage } from "@/core/modules/auth/service";
import { isSeasonId, SEASON_PREVIEW_COOKIE } from "@/data/seasons";
import { getShopSettings } from "@/core/modules/settings/service";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";
import { SeasonalSettingsForm } from "@/components/functional/admin/settings/SeasonalSettingsForm";

export const instant = false;

export default async function AdminSeasonSettingsPage() {
  await requireAdminPage();
  const [settings, cookieStore] = await Promise.all([getShopSettings(), cookies()]);
  const preview = cookieStore.get(SEASON_PREVIEW_COOKIE)?.value;
  return (
    <>
      <SettingsHeader
        title="Seizoen"
        intro="Kerst en andere seizoensversies van de website: aanzetten, plannen en vooraf bekijken."
      />
      <SeasonalSettingsForm settings={settings.seasonal} preview={isSeasonId(preview) ? preview : null} />
    </>
  );
}
