import { api } from "@/core/networking/api";
import type { SettingsSection, SettingsSectionInput, ShopSettings } from "./types";

export async function putSettingsSection<S extends SettingsSection>(section: S, input: SettingsSectionInput<S>) {
  const { data } = await api.put<{ settings: ShopSettings }>(`/admin/settings/${section}`, input);
  return data.settings;
}
