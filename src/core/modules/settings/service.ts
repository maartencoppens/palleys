import "server-only";
import { prisma } from "@/db/client";
import { shopSettingsSchema, type ShopSettings, type ShopSettingsInput } from "./types";

/*
 * Shop settings an admin changes in /admin/settings. One row (id 1); defaults apply until the first save.
 * Amounts in here are display/shipping configuration only. Product prices stay in code (src/data/pricing.ts).
 */
const SETTINGS_ID = 1;

const DEFAULTS: ShopSettingsInput = {
  checkoutEnabled: true,
  checkoutClosedMessage: null,
  shippingOverrides: {},
};

export async function getShopSettings(): Promise<ShopSettings> {
  const row = await prisma.shopSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return { ...DEFAULTS, updatedBy: null, updatedAt: null };
  // Stored JSON is re-validated: an invalid override (e.g. a removed option) falls back to the defaults.
  const overrides = shopSettingsSchema.shape.shippingOverrides.safeParse(row.shippingOverrides ?? {});
  return {
    checkoutEnabled: row.checkoutEnabled,
    checkoutClosedMessage: row.checkoutClosedMessage,
    shippingOverrides: overrides.success ? overrides.data : {},
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateShopSettings(input: ShopSettingsInput, adminName: string): Promise<ShopSettings> {
  const data = {
    checkoutEnabled: input.checkoutEnabled,
    checkoutClosedMessage: input.checkoutClosedMessage || null,
    shippingOverrides: input.shippingOverrides,
    updatedBy: adminName,
  };
  await prisma.shopSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });
  return getShopSettings();
}
