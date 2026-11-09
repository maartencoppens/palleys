import "server-only";
import { cache } from "react";
import type { z } from "zod";
import { prisma } from "@/db/client";
import { COMPANY, SOCIAL_LINKS } from "@/data/company";
import { UNIT_PRICE_CENTS } from "@/data/pricing";
import { DEFAULT_SITE_CONTENT } from "@/data/site-content";
import { DEFAULT_ANIMAL_PROMPTS, POSE_PROMPT } from "@/data/prompts";
import { DEFAULT_ANIMALS } from "@/data/animals";
import {
  catalogSettingsSchema,
  companySettingsSchema,
  promptSettingsSchema,
  storedShippingOverridesSchema,
  localizedSiteContentSchema,
  siteContentSchema,
  type LocalizedSiteContent,
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
    animals: DEFAULT_ANIMALS,
    disabledAnimals: [],
    disabledEditions: [],
  },
  content: DEFAULT_SITE_CONTENT,
  company: { ...COMPANY, socials: SOCIAL_LINKS },
  prompts: { base: POSE_PROMPT.trim(), animals: DEFAULT_ANIMAL_PROMPTS },
  updatedBy: null,
  updatedAt: null,
};

function parsed<T extends z.ZodType>(schema: T, value: unknown, fallback: z.infer<T>): z.infer<T> {
  if (value === null || value === undefined) return fallback;
  const result = schema.safeParse(value);
  if (!result.success) console.error("[settings] stored section is invalid, using the starting values");
  return result.success ? result.data : fallback;
}

/** Texts saved before there were languages are the Dutch ones. */
function parsedContent(value: unknown): LocalizedSiteContent {
  const dutchOnly = siteContentSchema.safeParse(value);
  if (dutchOnly.success) return { ...DEFAULTS.content, nl: dutchOnly.data };
  return parsed(localizedSiteContentSchema, value, DEFAULTS.content);
}

export async function getShopSettings(): Promise<ShopSettings> {
  const row = await prisma.shopSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return DEFAULTS;
  return {
    checkoutEnabled: row.checkoutEnabled,
    checkoutClosedMessage: row.checkoutClosedMessage,
    shippingOverrides: parsed(storedShippingOverridesSchema, row.shippingOverrides, {}),
    catalog: parsed(catalogSettingsSchema, row.catalog, DEFAULTS.catalog),
    content: parsedContent(row.siteContent),
    company: parsed(companySettingsSchema, row.company, DEFAULTS.company),
    prompts: parsed(promptSettingsSchema, row.prompts, DEFAULTS.prompts),
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
  prompts: (input) => ({ prompts: input }),
};

/** The starting prompts, for the "back to the standard text" button. */
export const DEFAULT_PROMPTS = DEFAULTS.prompts;

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
