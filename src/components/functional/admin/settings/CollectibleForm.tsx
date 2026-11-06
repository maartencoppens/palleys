"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { postCollectible, putCollectible, uploadCollectibleImage } from "@/core/modules/collectibles/api";
import {
  missingTranslations,
  TRANSLATED_LOCALES,
  type AdminCollectible,
  type CollectibleTranslation,
  type CollectibleTranslations,
  type TranslatedLocale,
} from "@/core/modules/collectibles/types";
import { LOCALE_LABELS } from "@/core/locale/config";
import { getApiErrorMessage } from "@/core/networking/api";
import { fromEuroInput, toEuroInput } from "@/core/utils/format";
import Button from "@/components/design/Button";
import { Input, Textarea } from "@/components/design/form";
import { COLLECTIBLE_LIMITS } from "@/data/collectibles";
import { MAX_PRODUCT_PRICE_CENTS } from "@/data/pricing";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/data/uploads";
import { compactFieldClassName, fieldLabelClassName, SaveBar, SettingsCard } from "./SettingsParts";

export function CollectibleForm({ collectible, nextSortOrder = 0 }: { collectible?: AdminCollectible; nextSortOrder?: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(collectible?.name ?? "");
  const [description, setDescription] = useState(collectible?.description ?? "");
  const [tag, setTag] = useState(collectible?.tag ?? "");
  const [translations, setTranslations] = useState<CollectibleTranslations>(collectible?.translations ?? {});
  const [price, setPrice] = useState(collectible ? toEuroInput(collectible.priceCents) : "");
  const [sortOrder, setSortOrder] = useState(String(collectible?.sortOrder ?? nextSortOrder));
  const [published, setPublished] = useState(collectible?.published ?? true);
  const [soldOut, setSoldOut] = useState(collectible?.soldOut ?? false);
  const [image, setImage] = useState({ key: collectible?.imageKey ?? null, url: collectible?.imageUrl ?? null });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) return setError("Deze foto is groter dan 10 MB.");
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadCollectibleImage(file);
      setImage({ key: uploaded.imageKey, url: uploaded.imageUrl });
    } catch (e) {
      setError(getApiErrorMessage(e, "Uploaden mislukt"));
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const priceCents = fromEuroInput(price);
    if (!name.trim()) return setError("Geef het product een naam");
    if (!priceCents || priceCents < 100 || priceCents > MAX_PRODUCT_PRICE_CENTS) {
      return setError(`Vul een geldige prijs in (bv. 25,95, maximum € ${MAX_PRODUCT_PRICE_CENTS / 100})`);
    }
    if (published && !image.key) return setError("Voeg een foto toe, of zet het product nog niet op de website");

    const cleaned = Object.fromEntries(
      TRANSLATED_LOCALES.map((locale) => [locale, trimTranslation(translations[locale])]),
    ) as CollectibleTranslations;
    const missing = missingTranslations({ name, description: description.trim() || null, tag: tag.trim() || null, translations: cleaned });
    if (published && missing.length > 0) {
      return setError(`Vul ${missingLabel(missing)} in, of zet het product nog niet op de website`);
    }

    const input = {
      name: name.trim(),
      description: description.trim() || null,
      tag: tag.trim() || null,
      priceCents,
      imageKey: image.key,
      published,
      soldOut,
      sortOrder: Math.max(0, Number.parseInt(sortOrder, 10) || 0),
      translations: cleaned,
    };
    setSaving(true);
    try {
      if (collectible) await putCollectible(collectible.id, input);
      else await postCollectible(input);
      router.push("/admin/settings/collectibles");
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <SettingsCard title="Product">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="collectible-name" className={fieldLabelClassName}>
              Naam
            </label>
            <Input
              id="collectible-name"
              value={name}
              maxLength={COLLECTIBLE_LIMITS.name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Golden Retriever"
              className={`mt-2 ${compactFieldClassName}`}
            />
            {collectible && <p className="mt-1 font-mono text-xs text-text-muted">{collectible.sku}</p>}
          </div>
          <div>
            <label htmlFor="collectible-price" className={fieldLabelClassName}>
              Prijs (€)
            </label>
            <Input
              id="collectible-price"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="25,95"
              className={`mt-2 ${compactFieldClassName}`}
            />
          </div>
          <div>
            <label htmlFor="collectible-tag" className={fieldLabelClassName}>
              Label op de kaart (optioneel)
            </label>
            <Input
              id="collectible-tag"
              value={tag}
              maxLength={COLLECTIBLE_LIMITS.tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="Bestseller"
              className={`mt-2 ${compactFieldClassName}`}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="collectible-description" className={fieldLabelClassName}>
              Beschrijving (optioneel)
            </label>
            <Textarea
              id="collectible-description"
              rows={4}
              maxLength={COLLECTIBLE_LIMITS.description}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 min-h-28 text-base!"
            />
          </div>
        </div>
      </SettingsCard>

      {TRANSLATED_LOCALES.map((locale) => (
        <TranslationCard
          key={locale}
          locale={locale}
          value={translations[locale] ?? {}}
          dutch={{ name, description, tag }}
          onChange={(value) => setTranslations((current) => ({ ...current, [locale]: value }))}
        />
      ))}

      <SettingsCard title="Foto" intro="JPG, PNG of WebP, maximaal 10 MB. Liefst op een transparante of effen achtergrond.">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative grid size-32 place-items-center overflow-hidden rounded-2xl bg-light-green text-xs text-text-muted">
            {image.url ? <Image src={image.url} alt="" fill sizes="128px" className="object-contain p-2" /> : "Nog geen foto"}
          </div>
          <Button
            type="button"
            variant="secondary"
            loading={uploading}
            loadingText="Uploaden…"
            onClick={() => inputRef.current?.click()}
          >
            {image.key ? "Foto vervangen" : "Foto kiezen"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={handleFile}
            className="hidden"
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Op de website">
        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-center gap-3 text-base font-semibold">
            <input
              type="checkbox"
              checked={published}
              onChange={(event) => setPublished(event.target.checked)}
              className="size-5 accent-medium-green"
            />
            Zichtbaar op de website
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-base font-semibold">
            <input
              type="checkbox"
              checked={soldOut}
              onChange={(event) => setSoldOut(event.target.checked)}
              className="size-5 accent-medium-green"
            />
            Uitverkocht (blijft zichtbaar, maar niet te bestellen)
          </label>
        </div>
        <label htmlFor="collectible-order" className={`mt-5 block ${fieldLabelClassName}`}>
          Volgorde (laag = eerst, de eerste vier staan op de homepage)
        </label>
        <Input
          id="collectible-order"
          type="number"
          min={0}
          max={9999}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          className={`mt-2 w-28 ${compactFieldClassName}`}
        />
      </SettingsCard>

      <SaveBar
        saving={saving}
        message={null}
        error={error}
        disabled={uploading}
        label={collectible ? "Opslaan" : "Collectible toevoegen"}
      />
    </form>
  );
}

const FIELD_NAMES = { name: "de naam", description: "de beschrijving", tag: "het label" } as const;
// The language names in Dutch, for the backoffice.
const LOCALE_NAMES: Record<TranslatedLocale, string> = { nl: "Nederlands", en: "Engels" };

/** ["en.name", "en.tag"] → "in het Engels ook de naam en het label". */
function missingLabel(missing: string[]) {
  return TRANSLATED_LOCALES.map((locale) => {
    const fields = missing
      .filter((entry) => entry.startsWith(`${locale}.`))
      .map((entry) => FIELD_NAMES[entry.slice(locale.length + 1) as keyof typeof FIELD_NAMES]);
    return fields.length > 0 ? `in het ${LOCALE_NAMES[locale]} ook ${fields.join(" en ")}` : null;
  })
    .filter(Boolean)
    .join(", ");
}

function trimTranslation(value: CollectibleTranslation | undefined): CollectibleTranslation {
  return {
    name: value?.name?.trim() || null,
    description: value?.description?.trim() || null,
    tag: value?.tag?.trim() || null,
  };
}

/** The same texts in another language. Empty fields show the Dutch text as a hint. */
function TranslationCard({
  locale,
  value,
  dutch,
  onChange,
}: {
  locale: TranslatedLocale;
  value: Partial<CollectibleTranslation>;
  dutch: { name: string; description: string; tag: string };
  onChange: (value: Partial<CollectibleTranslation>) => void;
}) {
  const id = (field: string) => `collectible-${locale}-${field}`;
  const set = (field: keyof CollectibleTranslation) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...value, [field]: event.target.value });
  return (
    <SettingsCard
      title={`${LOCALE_NAMES[locale]} (${LOCALE_LABELS[locale].short})`}
      intro={`Wat bezoekers van de ${LOCALE_LABELS[locale].name}-versie van de website zien. Elke tekst die je hierboven invult, vul je hier ook in.`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={id("name")} className={fieldLabelClassName}>
            Naam
          </label>
          <Input
            id={id("name")}
            lang={locale}
            value={value.name ?? ""}
            maxLength={COLLECTIBLE_LIMITS.name}
            onChange={set("name")}
            placeholder={dutch.name || "Golden Retriever"}
            className={`mt-2 ${compactFieldClassName}`}
          />
        </div>
        <div>
          <label htmlFor={id("tag")} className={fieldLabelClassName}>
            Label op de kaart {dutch.tag.trim() ? "" : "(optioneel)"}
          </label>
          <Input
            id={id("tag")}
            lang={locale}
            value={value.tag ?? ""}
            maxLength={COLLECTIBLE_LIMITS.tag}
            onChange={set("tag")}
            placeholder={dutch.tag || "Bestseller"}
            className={`mt-2 ${compactFieldClassName}`}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={id("description")} className={fieldLabelClassName}>
            Beschrijving {dutch.description.trim() ? "" : "(optioneel)"}
          </label>
          <Textarea
            id={id("description")}
            lang={locale}
            rows={4}
            maxLength={COLLECTIBLE_LIMITS.description}
            value={value.description ?? ""}
            onChange={set("description")}
            placeholder={dutch.description}
            className="mt-2 min-h-28 text-base!"
          />
        </div>
      </div>
    </SettingsCard>
  );
}
