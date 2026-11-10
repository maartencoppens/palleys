"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Label, Textarea } from "@/components/design/form";
import { Link, useLocale, useMessages } from "@/core/locale/client";
import { fill, fillNodes } from "@/core/locale/fill";
import { attachmentIcons } from "./AttachmentIcons";
import OrderSummary from "./OrderSummary";
import PalleySize from "@/components/functional/shop/PalleySize";
import PhotoTips from "./PhotoTips";
import PhotoUpload, { type UploadedPhoto } from "./PhotoUpload";
import {
  attachments,
  editions,
  STEP_IDS,
  type Attachment,
  type Edition,
  type StepId,
  type StepStatus,
} from "@/data/options";
import Stepper from "@/components/design/Stepper";
import Panel from "@/components/design/Panel";
import ChoiceChips from "@/components/design/ChoiceChips";
import { formatPrice } from "@/core/utils/format";
import { editionPriceCents, shownSizeLabel } from "@/core/modules/catalog/utils";
import type { CatalogSettings } from "@/core/modules/settings/types";
import { useAddPalleyToCart } from "@/core/hooks/useAddPalleyToCart";
import { PRIVACY_URL, TERMS_URL } from "@/data/checkout";
import { publishCart } from "@/core/hooks/useCartSnapshot";
import Button from "@/components/design/Button";
import WarningNote from "@/components/design/WarningNote";

const errorClassName = "font-label text-base font-semibold text-[#a3341a]";

type ConfiguratorProps = {
  /** Prices and available options from /admin/settings/products. */
  catalog: CatalogSettings;
  deliveryTime: string;
  returnNote: string;
};

/*
 * Configurator for a custom Palley (Figma: Frame 29 – stepper, three step panels and an order summary).
 * All steps stay visible, so people can scroll back and change things; the first unfinished step is
 * highlighted, and the stepper reflects progress. "Add to cart" checks everything and, if something is
 * missing, jumps to that step and shows what's needed.
 */
export default function Configurator({ catalog, deliveryTime, returnNote }: ConfiguratorProps) {
  const { create: m, options, common } = useMessages();
  const locale = useLocale();
  const sizeLabel = shownSizeLabel(locale);
  const animalOptions = catalog.animals
    .filter((option) => !catalog.disabledAnimals.includes(option.value))
    .map((option) => ({ value: option.value, label: option.labels[locale] }));
  const editionOptions = editions
    .filter((option) => !catalog.disabledEditions.includes(option.value))
    .map((option) => ({ value: option.value, label: options.editions[option.value] }));
  const attachmentOptions = attachments.map((option) => ({
    value: option.value,
    label: options.attachments[option.value],
    icon: attachmentIcons[option.value],
  }));
  const [animal, setAnimal] = useState<string | null>(null);
  // Palleys are keychains first, so that's preselected (when on sale); switching to a figure is one tap.
  const [edition, setEdition] = useState<Edition>(editionOptions[0].value);
  const [attachment, setAttachment] = useState<Attachment>(attachments[0].value);
  const withKeychain = edition === "keychain";
  const priceCents = editionPriceCents(edition, catalog.prices);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const {
    addToCart,
    reset,
    status: cartStatus,
    error: cartError,
    busy,
    cart,
  } = useAddPalleyToCart();
  const added = cartStatus === "done";

  // Updates the navbar's cart badge and opens the mini cart, so the visitor sees where their Palley went.
  useEffect(() => {
    if (added && cart) publishCart(cart, { reveal: true });
  }, [added, cart]);

  const chooseHeadingRef = useRef<HTMLHeadingElement>(null);
  const uploadHeadingRef = useRef<HTMLHeadingElement>(null);
  const orderHeadingRef = useRef<HTMLHeadingElement>(null);

  // Free the photo previews when leaving the page.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () =>
      photosRef.current.forEach(
        (item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl),
      ),
    [],
  );

  const photosLabel =
    photos.length === 0
      ? null
      : photos.length === 1
        ? photos[0].file.name
        : fill(m.summary.photosCount, { count: photos.length });

  const animalLabel = animalOptions.find((option) => option.value === animal)?.label ?? null;
  const editionLabel = options.editions[edition];
  const attachmentLabel = withKeychain ? options.attachments[attachment] : null;
  const complete: Record<StepId, boolean> = {
    choose: Boolean(animal),
    upload: photos.length > 0,
    order: consent,
  };
  const activeStep = STEP_IDS.find((step) => !complete[step]) ?? null;
  const nextStep = activeStep ? STEP_IDS[STEP_IDS.indexOf(activeStep) + 1] : undefined;
  const status = Object.fromEntries(
    STEP_IDS.map((step) => [step, complete[step] ? "done" : step === activeStep ? "active" : "upcoming"]),
  ) as Record<StepId, StepStatus>;

  const handleAddToCart = (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (activeStep) {
      setShowErrors(true);
      const headingRef = {
        choose: chooseHeadingRef,
        upload: uploadHeadingRef,
        order: orderHeadingRef,
      }[activeStep];
      const heading = headingRef.current;
      heading?.scrollIntoView({ behavior: "smooth", block: "start" });
      heading?.focus({ preventScroll: true });
      return;
    }
    // Uploads the photos to R2, then adds the preview with the chosen variant and notes to the cart.
    void addToCart({ animal: animal!, edition, attachment: withKeychain ? attachment : undefined, photos, notes });
  };

  const startOver = () => {
    setAnimal(null);
    setEdition(editionOptions[0].value);
    setAttachment(attachments[0].value);
    photos.forEach(
      (item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl),
    );
    setPhotos([]);
    setNotes("");
    setConsent(false);
    setShowErrors(false);
    reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <form onSubmit={handleAddToCart} noValidate>
      {/* Stays in view while scrolling through the steps. */}
      <div className="sticky top-[var(--nav-offset,0px)] z-20 bg-page/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1224px] section-x pt-4 pb-3 md:pt-6 md:pb-2 lg:px-8">
          <Stepper status={status} />
        </div>
      </div>

      <div className="mx-auto flex max-w-[1224px] flex-col gap-8 section-x section-pb pt-6 md:pt-12 lg:flex-row lg:px-8 lg:items-start lg:gap-12">
        <div
          data-animate="stagger"
          className="flex min-w-0 flex-1 flex-col gap-6 md:gap-8"
        >
          <Panel
            id="choose"
            number={1}
            title={m.choose.title}
            status={status.choose}
            isNext={nextStep === "choose"}
            headingRef={chooseHeadingRef}
          >
            <ChoiceChips
              legend={m.choose.animal}
              name="animal"
              options={animalOptions}
              value={animal}
              onChange={setAnimal}
              error={
                showErrors && !animal ? m.choose.animalError : undefined
              }
            />
            <ChoiceChips
              legend={m.choose.edition}
              name="edition"
              options={editionOptions}
              value={edition}
              onChange={setEdition}
            />
            {withKeychain && (
              <ChoiceChips
                legend={m.choose.attachment}
                name="attachment"
                options={attachmentOptions}
                value={attachment}
                onChange={setAttachment}
                hint={m.choose.keychainHint}
              />
            )}
            {/* The size on its own, so nobody expects a big statue. Same for keychain and figurine. */}
            <PalleySize size={sizeLabel} title={m.choose.sizeTitle} text={fill(m.choose.size, { size: sizeLabel })} />
          </Panel>

          <Panel
            id="upload"
            number={2}
            title={m.upload.title}
            status={status.upload}
            isNext={nextStep === "upload"}
            headingRef={uploadHeadingRef}
          >
            <PhotoUpload
              photos={photos}
              onChange={setPhotos}
              error={
                showErrors && photos.length === 0
                  ? m.upload.missing
                  : undefined
              }
            />
            <PhotoTips />
            {/* Sets expectations: AI makes the model, and people check it. */}
            <aside
              aria-label={m.upload.infoLabel}
              className="flex items-start gap-3 rounded-[20px] bg-light-yellow p-4 text-text-primary md:p-5"
            >
              <span
                className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-medium-green font-label text-sm font-bold text-off-white"
                aria-hidden
              >
                i
              </span>
              <p className="text-base leading-[1.5]">
                <strong className="font-label font-bold">
                  {m.upload.infoTitle}
                </strong>{" "}
                {m.upload.infoText}
              </p>
            </aside>
          </Panel>

          <Panel
            id="order"
            number={3}
            title={m.order.title}
            status={status.order}
            isNext={nextStep === "order"}
            headingRef={orderHeadingRef}
          >
            <div className="flex flex-col gap-3">
              <Label htmlFor="notes">
                {m.order.notes}{" "}
                <span className="font-semibold text-placeholder">
                  {m.order.optional}
                </span>
              </Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder={m.order.notesPlaceholder}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-40 md:min-h-[200px] md:px-[30px] md:py-6"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-start gap-3.5 text-base leading-[1.5] text-text-primary">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  aria-labelledby="consent-label"
                  aria-describedby={
                    showErrors && !consent ? "consent-error" : undefined
                  }
                  className="mt-px size-6 shrink-0 cursor-pointer accent-medium-green"
                />
                {/* Spelled out point by point, so it's clear what ticking the box means. */}
                <span id="consent-label" className="flex flex-col gap-1">
                  <span className="font-label font-semibold">{m.order.consentIntro}</span>
                  <span className="flex flex-col gap-1">
                    {m.order.consentPoints.map((point) => (
                      <span key={point} className="flex gap-2">
                        <span className="text-medium-green" aria-hidden>•</span>
                        <span>
                          {fillNodes(point, {
                            terms: (
                              <Link href={TERMS_URL} className="font-semibold text-medium-green underline underline-offset-2">
                                {m.order.terms}
                              </Link>
                            ),
                            privacy: (
                              <Link href={PRIVACY_URL} className="font-semibold text-medium-green underline underline-offset-2">
                                {m.order.privacy}
                              </Link>
                            ),
                          })}
                        </span>
                      </span>
                    ))}
                  </span>
                </span>
              </label>
              {showErrors && !consent && (
                <p id="consent-error" className={errorClassName}>
                  {m.order.consentError}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-light-green px-5 py-4">
              <Image
                src="/images/create/truck.svg"
                width={22}
                height={18}
                alt=""
                aria-hidden
                className="shrink-0"
              />
              <p className="text-base leading-[1.5] text-text-primary md:text-lg">
                {fill(m.order.info, { deliveryTime })}
              </p>
            </div>
            <WarningNote>{common.heatWarning}</WarningNote>
            <p className="-mt-2 text-sm leading-[1.5] text-text-primary md:-mt-3">
              {returnNote}
            </p>

            {added ? (
              <div
                role="status"
                className="flex flex-col gap-5 rounded-2xl bg-light-green/40 p-5 ring-2 ring-light-green ring-inset md:p-6"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-medium-green"
                    aria-hidden
                  >
                    <Image
                      src="/images/create/check.svg"
                      width={19}
                      height={14}
                      alt=""
                    />
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="font-display text-2xl leading-[1.2] font-bold text-medium-green">
                      {m.order.addedTitle}
                    </p>
                    <p className="text-base leading-[1.5] text-text-primary">
                      {fill(m.order.addedLine, {
                        animal: animalLabel ?? "",
                        edition: editionLabel.toLowerCase(),
                        price: formatPrice(priceCents / 100, locale),
                      })}
                      {cart && cart.totalQuantity > 1 ? fill(m.order.addedCount, { count: cart.totalQuantity }) : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  {/* Straight to the checkout: the shortest way to paying. */}
                  {cart ? (
                    <Link
                      href="/checkout"
                      className="group flex items-center justify-center gap-3 rounded-pill bg-orange px-7 py-3.5 font-label text-base font-semibold text-off-white transition hover:bg-orange-hover active:scale-[0.98]"
                    >
                      {common.checkout}
                      <Image
                        className="transition-transform group-hover:translate-x-1"
                        src="/images/cta/arrow-right.svg"
                        width={13.3333}
                        height={13.3333}
                        alt=""
                        aria-hidden
                      />
                    </Link>
                  ) : null}
                  <Button variant="secondary" href="/cart" className="py-3.5">
                    {m.order.viewCart}
                  </Button>
                  <button
                    type="button"
                    onClick={startOver}
                    className="py-2 font-label text-base font-bold text-medium-green underline underline-offset-4 hover:text-orange sm:ml-auto"
                  >
                    {m.order.another}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* The summary sits below the steps on small screens, so the price is repeated here. */}
                <p className="font-label text-2xl font-extrabold text-medium-green lg:hidden">
                  {formatPrice(priceCents / 100, locale)}
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  aria-busy={busy}
                  className="group flex disabled:cursor-wait disabled:opacity-70 items-center justify-center gap-3 self-stretch rounded-full bg-orange py-[18px] pr-6 pl-7 font-label text-lg leading-[normal] font-semibold text-off-white transition hover:bg-orange-hover active:scale-[0.98] sm:self-auto lg:order-first"
                >
                  {cartStatus === "uploading"
                    ? m.order.uploading
                    : cartStatus === "adding"
                      ? m.order.adding
                      : m.order.add}
                  <Image
                    className="transition-transform group-hover:translate-x-1"
                    src="/images/cta/arrow-right.svg"
                    width={13.3333}
                    height={13.3333}
                    alt=""
                    aria-hidden
                  />
                </button>
              </div>
            )}
            {cartError && (
              <p role="alert" className={errorClassName}>
                {cartError}
              </p>
            )}
          </Panel>
        </div>

        <div
          data-animate="pop"
          className="lg:sticky lg:top-[calc(var(--nav-offset,0px)+7rem)] lg:w-[420px] lg:shrink-0"
        >
          <OrderSummary
            pet={animalLabel}
            edition={editionLabel}
            attachment={attachmentLabel}
            size={fill(m.summary.sizeValue, { size: sizeLabel })}
            photos={photosLabel}
            priceCents={priceCents}
          />
        </div>
      </div>
    </form>
  );
}
