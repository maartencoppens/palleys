import { api } from "@/core/networking/api";
import type { ShopSettings, ShopSettingsInput } from "./types";

export async function putShopSettings(input: ShopSettingsInput) {
  const { data } = await api.put<{ settings: ShopSettings }>("/admin/settings", input);
  return data.settings;
}
