import "server-only";
import { cache } from "react";
import type { z } from "zod";
import { prisma } from "@/db/client";
import { COMPANY, SOCIAL_LINKS } from "@/data/company";
import { UNIT_PRICE_CENTS } from "@/data/pricing";
import { DEFAULT_SITE_CONTENT } from "@/data/site-content";
import {
  catalogSettingsSchema,
  companySettingsSchema,
  shippingSettingsSchema,
  siteContentSchema,
  type SettingsSection,
  type SettingsSectionInput,
  type ShopSettings,
} from "./types";

/*
 * Website settings an admin changes in /admin/settings. One row (id 1); src/data holds the starting values, which
 * apply until the first save. Stored JSON is re-validated on every read: a section that no longer fits its schema
 * (e.g. after a removed option) falls back to the starting values instead of breaking the shop.
 */
const SETTINGS_ID = 1;

const DEFAULTS: ShopSettings = {
  checkoutEnabled: true,
  checkoutClosedMessage: null,
  shippingOverrides: {},
  catalog: {
    prices: { keychain: UNIT_PRICE_CENTS.keychain.M, figurine: UNIT_PRICE_CENTS.figurine.M },
    disabledAnimals: [],
    disabledEditions: [],
  },
  content: DEFAULT_SITE_CONTENT,
  company: { ...COMPANY, socials: SOCIAL_LINKS },
  updatedBy: null,
  updatedAt: null,
};

function parsed<T extends z.ZodType>(schema: T, value: unknown, fallback: z.infer<T>): z.infer<T> {
  if (value === null || value === undefined) return fallback;
  const result = schema.safeParse(value);
  if (!result.success) console.error("[settings] stored section is invalid, using the starting values");
  return result.success ? result.data : fallback;
}

export async function getShopSettings(): Promise<ShopSettings> {
  const row = await prisma.shopSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return DEFAULTS;
  return {
    checkoutEnabled: row.checkoutEnabled,
    checkoutClosedMessage: row.checkoutClosedMessage,
    shippingOverrides: parsed(shippingSettingsSchema.shape.shippingOverrides, row.shippingOverrides, {}),
    catalog: parsed(catalogSettingsSchema, row.catalog, DEFAULTS.catalog),
    content: parsed(siteContentSchema, row.siteContent, DEFAULTS.content),
    company: parsed(companySettingsSchema, row.company, DEFAULTS.company),
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * For rendering public pages: once per request, and never the reason a page fails. If the database is unreachable the
 * site shows its starting values. Anything that charges money uses getShopSettings, which does fail.
 */
export const getSiteSettings = cache(async (): Promise<ShopSettings> => {
  try {
    return await getShopSettings();
  } catch (error) {
    console.error("[settings] could not be loaded:", error instanceof Error ? error.message : error);
    return DEFAULTS;
  }
});

// The row's columns per section. Only the section being saved is written.
const SECTION_DATA: { [S in SettingsSection]: (input: SettingsSectionInput<S>) => object } = {
  ordering: (input) => ({
    checkoutEnabled: input.checkoutEnabled,
    checkoutClosedMessage: input.checkoutClosedMessage || null,
  }),
  shipping: (input) => ({ shippingOverrides: input.shippingOverrides }),
  catalog: (input) => ({ catalog: input }),
  content: (input) => ({ siteContent: input }),
  company: (input) => ({ company: input }),
};

export async function updateSettingsSection<S extends SettingsSection>(
  section: S,
  input: SettingsSectionInput<S>,
  adminName: string,
): Promise<ShopSettings> {
  const data = { ...SECTION_DATA[section](input), updatedBy: adminName };
  await prisma.shopSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });
  return getShopSettings();
}
