"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Label, Textarea } from "@/components/design/form";
import OrderSummary from "./OrderSummary";
import PhotoTips from "./PhotoTips";
import PhotoUpload, { type UploadedPhoto } from "./PhotoUpload";
import {
  animals,
  editions,
  findOption,
  PALLEY_PRICE,
  PALLEY_SIZE,
  RETURN_NOTE,
  steps,
  type Animal,
  type Edition,
  type StepId,
  type StepStatus,
} from "@/data/options";
import Stepper from "@/components/design/Stepper";
import Panel from "@/components/design/Panel";
import ChoiceChips from "@/components/design/ChoiceChips";
import { formatPrice } from "@/core/utils/format";
import { useAddPalleyToCart } from "@/core/hooks/useAddPalleyToCart";

const errorClassName = "font-label text-base font-semibold text-[#a3341a]";

/*
 * Configurator for a custom Palley (Figma: Frame 29 – stepper, three step panels and an order summary).
 * All steps stay visible, so people can scroll back and change things; the first unfinished step is
 * highlighted, and the stepper reflects progress. "Add to cart" checks everything and, if something is
 * missing, jumps to that step and shows what's needed.
 */
export default function Configurator() {
  const [animal, setAnimal] = useState<Animal | null>(null);
  // Palleys are keychains first, so that's preselected; switching to a figure is one tap.
  const [edition, setEdition] = useState<Edition>("keychain");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const { addToCart, reset, status: cartStatus, error: cartError, busy } =
    useAddPalleyToCart();
  const added = cartStatus === "done";

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

  // The summary previews the first photo the browser can display.
  const previewUrl = photos.find((item) => item.previewUrl)?.previewUrl ?? null;
  const photosLabel =
    photos.length === 0
      ? null
      : photos.length === 1
        ? photos[0].file.name
        : `${photos.length} foto’s`;

  const animalLabel = findOption(animals, animal)?.label ?? null;
  const editionLabel = findOption(editions, edition)?.label ?? null;
  const complete: Record<StepId, boolean> = {
    choose: Boolean(animal),
    upload: photos.length > 0,
    order: consent,
  };
  const activeStep = steps.find((step) => !complete[step.id])?.id ?? null;
  const nextStep = activeStep
    ? steps[steps.findIndex((step) => step.id === activeStep) + 1]?.id
    : undefined;
  const status = Object.fromEntries(
    steps.map((step) => [
      step.id,
      complete[step.id]
        ? "done"
        : step.id === activeStep
          ? "active"
          : "upcoming",
    ]),
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
    // Uploads the photos to R2, then adds the matching Shopify variant with the preview ID and notes.
    void addToCart({ animal: animal!, edition, photos, notes });
  };

  const startOver = () => {
    setAnimal(null);
    setEdition("keychain");
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
            title="Kies je Palley"
            status={status.choose}
            isNext={nextStep === "choose"}
            headingRef={chooseHeadingRef}
          >
            <ChoiceChips
              legend="Welk huisdier heb je?"
              name="animal"
              options={animals}
              value={animal}
              onChange={setAnimal}
              error={
                showErrors && !animal ? "Kies je soort huisdier." : undefined
              }
            />
            <ChoiceChips
              legend="Sleutelhanger of figuurtje?"
              name="edition"
              options={editions}
              value={edition}
              onChange={setEdition}
              hint={`${PALLEY_SIZE}. Het figuurtje komt zonder sleutelring.`}
            />
          </Panel>

          <Panel
            id="upload"
            number={2}
            title="Upload je foto’s"
            status={status.upload}
            isNext={nextStep === "upload"}
            headingRef={uploadHeadingRef}
          >
            <PhotoUpload
              photos={photos}
              onChange={setPhotos}
              error={
                showErrors && photos.length === 0
                  ? "Upload minstens één foto van je huisdier om verder te gaan."
                  : undefined
              }
            />
            <PhotoTips />
            {/* Sets expectations: the 3D model isn't generated automatically and fully hands-off. */}
            <aside
              aria-label="Goed om te weten"
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
                  Elk model wordt met de hand bijgewerkt.
                </strong>{" "}
                Na je bestelling werkt ons team in Gent het 3D-model van je
                huisdier met de hand bij, zodat vlekjes, kleuren en dat ene
                flaporetje er precies goed uitkomen.
              </p>
            </aside>
          </Panel>

          <Panel
            id="order"
            number={3}
            title="Nakijken & bestellen"
            status={status.order}
            isNext={nextStep === "order"}
            headingRef={orderHeadingRef}
          >
            <div className="flex flex-col gap-3">
              <Label htmlFor="notes">
                Iets wat we moeten weten?{" "}
                <span className="font-semibold text-placeholder">
                  (optioneel)
                </span>
              </Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder="Vlekjes, kleur van de ogen, dat ene flaporetje…"
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
                <span id="consent-label">
                  Ik bevestig dat ik deze foto’s mag gebruiken en ga akkoord met
                  de{" "}
                  <Link
                    href="/terms"
                    className="font-semibold text-medium-green underline underline-offset-2"
                  >
                    algemene voorwaarden
                  </Link>
                  .
                </span>
              </label>
              {showErrors && !consent && (
                <p id="consent-error" className={errorClassName}>
                  Vink dit aan om je bestelling te plaatsen.
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
                Elke Palley wordt met de hand gemodelleerd en geprint. Binnen
                2–3 weken valt hij in je bus.
              </p>
            </div>
            <p className="-mt-2 text-sm leading-[1.5] text-text-primary md:-mt-3">
              {RETURN_NOTE}
            </p>

            {added ? (
              <div
                role="status"
                className="flex flex-col items-start gap-4 rounded-2xl bg-off-white p-5 md:p-6"
              >
                <p className="font-display text-2xl leading-[1.2] font-bold text-medium-green">
                  Je Palley zit in je winkelmandje!
                </p>
                <p className="text-base leading-[1.5] text-text-primary">
                  {`Je Palley (${animalLabel?.toLowerCase()}, ${editionLabel?.toLowerCase()}) staat klaar om af te rekenen.`}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/cart"
                    className="rounded-full bg-orange px-6 py-3 font-label text-base font-semibold text-off-white transition hover:bg-orange-hover"
                  >
                    Naar winkelmandje
                  </Link>
                  <button
                    type="button"
                    onClick={startOver}
                    className="font-label text-base font-bold text-medium-green underline underline-offset-4"
                  >
                    Nog een Palley maken
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* The summary sits below the steps on small screens, so the price is repeated here. */}
                <p className="font-label text-2xl font-extrabold text-medium-green lg:hidden">
                  {formatPrice(PALLEY_PRICE)}
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  aria-busy={busy}
                  className="group flex disabled:cursor-wait disabled:opacity-70 items-center justify-center gap-3 self-stretch rounded-full bg-orange py-[18px] pr-6 pl-7 font-label text-lg leading-[normal] font-semibold text-off-white transition hover:bg-orange-hover active:scale-[0.98] sm:self-auto lg:order-first"
                >
                  {cartStatus === "uploading"
                    ? "Foto’s uploaden…"
                    : cartStatus === "adding"
                      ? "Toevoegen…"
                      : "In winkelmandje"}
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
            photos={photosLabel}
            previewUrl={previewUrl}
          />
        </div>
      </div>
    </form>
  );
}
