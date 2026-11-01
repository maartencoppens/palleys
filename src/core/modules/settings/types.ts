import { z } from "zod";
import { animals, editions, type Animal, type Edition } from "@/data/options";
import { FIELD_LIMITS } from "@/data/checkout";
import { MAX_PRODUCT_PRICE_CENTS } from "@/data/pricing";
import { MAX_SHIPPING_PRICE_CENTS, STATIC_DELIVERY_OPTIONS } from "@/data/shipping";
import { SITE_CONTENT_LIMITS } from "@/data/site-content";

/*
 * The website configuration an admin manages in /admin/settings. Every section has its own form, schema and save, so
 * two admins working on different pages don't overwrite each other. Adding a setting: extend the schema here, add its
 * starting value in service.ts (from src/data) and a field in the section's form.
 */

const optionIds = STATIC_DELIVERY_OPTIONS.map((option) => option.id) as [string, ...string[]];
const animalValues = animals.map((animal) => animal.value) as [Animal, ...Animal[]];
const editionValues = editions.map((edition) => edition.value) as [Edition, ...Edition[]];

export const shippingOverrideSchema = z.object({
  priceCents: z.number().int().min(0).max(MAX_SHIPPING_PRICE_CENTS),
  enabled: z.boolean(),
});

export const orderingSettingsSchema = z.object({
  checkoutEnabled: z.boolean(),
  checkoutClosedMessage: z.string().trim().max(300).nullable(),
});

export const shippingSettingsSchema = z.object({
  shippingOverrides: z.partialRecord(z.enum(optionIds), shippingOverrideSchema),
});

const priceSchema = z.number().int().min(100).max(MAX_PRODUCT_PRICE_CENTS);

export const catalogSettingsSchema = z
  .object({
    prices: z.object({ keychain: priceSchema, figurine: priceSchema }),
    disabledAnimals: z.array(z.enum(animalValues)),
    disabledEditions: z.array(z.enum(editionValues)),
  })
  .refine((value) => value.disabledAnimals.length < animals.length, {
    path: ["disabledAnimals"],
    message: "Laat minstens één dier aan staan",
  })
  .refine((value) => value.disabledEditions.length < editions.length, {
    path: ["disabledEditions"],
    message: "Laat minstens één uitvoering aan staan",
  });

const { infoBannerMessages, deliveryTime, returnNote, faq } = SITE_CONTENT_LIMITS;

export const siteContentSchema = z.object({
  infoBannerMessages: z.array(z.string().trim().min(1).max(infoBannerMessages.length)).min(1).max(infoBannerMessages.items),
  deliveryTime: z.string().trim().min(1).max(deliveryTime),
  returnNote: z.string().trim().min(1).max(returnNote),
  faq: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(faq.question),
        answer: z.string().trim().min(1).max(faq.answer),
      }),
    )
    .max(faq.items),
});

const socialUrl = z.union([z.literal(""), z.url({ protocol: /^https$/ }).max(300)]);

export const companySettingsSchema = z.object({
  legalName: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(200),
  enterpriseNumber: z.string().trim().min(1).max(40),
  vatNumber: z.string().trim().min(1).max(40),
  email: z.email().max(FIELD_LIMITS.email),
  phone: z.string().trim().max(FIELD_LIMITS.phone),
  socials: z.object({ instagram: socialUrl, tiktok: socialUrl, facebook: socialUrl }),
});

export const SETTINGS_SECTION_SCHEMAS = {
  ordering: orderingSettingsSchema,
  shipping: shippingSettingsSchema,
  catalog: catalogSettingsSchema,
  content: siteContentSchema,
  company: companySettingsSchema,
} as const;

export type SettingsSection = keyof typeof SETTINGS_SECTION_SCHEMAS;
export type SettingsSectionInput<S extends SettingsSection> = z.infer<(typeof SETTINGS_SECTION_SCHEMAS)[S]>;

export function isSettingsSection(value: string): value is SettingsSection {
  return Object.hasOwn(SETTINGS_SECTION_SCHEMAS, value);
}

export type ShippingOverride = z.infer<typeof shippingOverrideSchema>;
export type OrderingSettings = z.infer<typeof orderingSettingsSchema>;
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;
export type CatalogSettings = z.infer<typeof catalogSettingsSchema>;
export type SiteContent = z.infer<typeof siteContentSchema>;
export type CompanySettings = z.infer<typeof companySettingsSchema>;

export type ShopSettings = OrderingSettings &
  ShippingSettings & {
    catalog: CatalogSettings;
    content: SiteContent;
    company: CompanySettings;
    updatedBy: string | null;
    updatedAt: string | null;
  };
