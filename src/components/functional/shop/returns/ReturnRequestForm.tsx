"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Button from "@/components/design/Button";
import ChoiceChips from "@/components/design/ChoiceChips";
import { Label, Textarea } from "@/components/design/form";
import QuantityStepper from "@/components/functional/shop/cart/QuantityStepper";
import { useLocale, useMessages } from "@/core/locale/client";
import { fill } from "@/core/locale/fill";
import { postReturnRequest, uploadReturnPhotos } from "@/core/modules/returns/api";
import { RETURN_RESOLUTIONS, type ReturnOverview, type ReturnReceipt, type ReturnSubmitRequest } from "@/core/modules/returns/types";
import { allowedQuantity, withdrawalNeedsReturn } from "@/core/modules/returns/utils";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, type ImageMimeType } from "@/data/uploads";
import {
  MAX_RETURN_PHOTOS,
  MAX_RETURN_REASON_LENGTH,
  MIN_RETURN_PHOTOS,
  MIN_WARRANTY_DESCRIPTION_LENGTH,
} from "@/data/returns";
import { ACCEPTED_PHOTO_EXTENSIONS, MAX_PHOTO_SIZE_LABEL } from "@/data/options";
import type { ReturnResolution, ReturnType } from "@/db/generated/enums";
import { cardClassName, errorClassName, hintClassName, labelClassName } from "./styles";

type Field = "items" | "reason" | "photos" | "resolution";
type Draft = {
  quantities: Record<string, number>; // orderItemId → copies; absent = not chosen
  reason: string;
  photos: File[];
  resolution: ReturnResolution | null;
};

// Where focus goes for each field with an error, in the order of the form.
const FIELD_FOCUS: Record<Field, string> = {
  items: "#return-request input[type='checkbox']",
  reason: "#return-reason",
  photos: "#return-photos",
  resolution: "input[name='return-resolution']",
};

const EMPTY: Draft = { quantities: {}, reason: "", photos: [], resolution: null };

function draftErrors(type: ReturnType, draft: Draft) {
  const errors = new Set<Field>();
  if (Object.keys(draft.quantities).length === 0) errors.add("items");
  if (type === "WARRANTY") {
    if (draft.reason.trim().length < MIN_WARRANTY_DESCRIPTION_LENGTH) errors.add("reason");
    if (draft.photos.length < MIN_RETURN_PHOTOS || draft.photos.length > MAX_RETURN_PHOTOS) errors.add("photos");
    if (!draft.resolution) errors.add("resolution");
  }
  return errors;
}

/*
 * One request: which Palleys (and how many), then what the type needs, then a summary with its own confirm button.
 * LEGAL-REVIEW: the online withdrawal function asks for a separate confirmation step after the summary, and no more
 * than needed: the items and an optional reason. Photos are only uploaded when the customer confirms.
 */
export default function ReturnRequestForm({
  type,
  overview,
  onBack,
  onDone,
  onSessionLost,
}: {
  type: ReturnType;
  overview: ReturnOverview;
  onBack: () => void;
  onDone: (receipt: ReturnReceipt) => void;
  onSessionLost: () => void;
}) {
  const { returns: m, common } = useMessages();
  const locale = useLocale();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [step, setStep] = useState<"edit" | "summary">("edit");
  const [errors, setErrors] = useState<Set<Field>>(new Set());
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const eligible = useMemo(() => overview.items.filter((item) => allowedQuantity(item.options, type) > 0), [overview.items, type]);
  const chosen = eligible.filter((item) => item.id in draft.quantities);
  const photoUrls = useMemo(() => draft.photos.map((file) => URL.createObjectURL(file)), [draft.photos]);
  useEffect(() => () => photoUrls.forEach((url) => URL.revokeObjectURL(url)), [photoUrls]);
  useEffect(() => headingRef.current?.focus(), [step]);

  const typeLower = m.typesLower[type];
  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const toggle = (id: string, checked: boolean) => {
    const quantities = { ...draft.quantities };
    if (checked) quantities[id] = 1;
    else delete quantities[id];
    set({ quantities });
  };

  const addPhotos = (files: FileList | null) => {
    setPhotoError(null);
    const picked = [...(files ?? [])];
    if (picked.some((file) => !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type))) return setPhotoError(m.form.errors.photoType);
    if (picked.some((file) => file.size > MAX_UPLOAD_BYTES)) return setPhotoError(fill(m.form.errors.photoSize, { size: MAX_PHOTO_SIZE_LABEL }));
    set({ photos: [...draft.photos, ...picked].slice(0, MAX_RETURN_PHOTOS) });
  };

  const toSummary = (event: React.FormEvent) => {
    event.preventDefault();
    const found = draftErrors(type, draft);
    setErrors(found);
    if (found.size > 0) {
      // By selector, not aria-invalid: that only lands with the next render.
      document.querySelector<HTMLElement>(FIELD_FOCUS[[...found][0]])?.focus();
      return;
    }
    setStep("summary");
  };

  const confirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const items = Object.entries(draft.quantities).map(([orderItemId, quantity]) => ({ orderItemId, quantity }));
      const reason = draft.reason.trim() || undefined;
      const input: ReturnSubmitRequest =
        type === "WARRANTY"
          ? {
              type,
              items,
              reason: draft.reason.trim(),
              resolution: draft.resolution!,
              photoKeys: await uploadReturnPhotos(draft.photos, draft.photos.map((file) => file.type as ImageMimeType)),
            }
          : { type, items, reason };
      onDone(await postReturnRequest(input, locale));
    } catch (error) {
      setSubmitting(false);
      const code = axios.isAxiosError<{ error?: string }>(error) ? error.response?.data?.error : null;
      if (code === "session") return onSessionLost();
      setSubmitError(code === "not_allowed" ? m.form.errors.notAllowed : code === "upload" ? m.form.errors.upload : common.genericError);
    }
  };

  const describedBy = (field: Field, hint?: string) => [hint, errors.has(field) && `return-${field}-error`].filter(Boolean).join(" ") || undefined;
  const fieldError = (field: Field, text: string) =>
    errors.has(field) && (
      <p id={`return-${field}-error`} className={errorClassName}>
        {text}
      </p>
    );

  if (step === "summary") {
    const received = type === "WITHDRAWAL" && withdrawalNeedsReturn(chosen.map((item) => item.options));
    const next =
      type === "CANCELLATION"
        ? m.summary.cancellation
        : type === "WARRANTY"
          ? m.summary.warranty
          : received
            ? fill(m.summary.withdrawalAfter, { address: overview.returnAddress || m.summary.returnAddressMissing })
            : m.summary.withdrawalBefore;
    return (
      <section aria-labelledby="return-summary-title" className={cardClassName}>
        <h2 id="return-summary-title" ref={headingRef} tabIndex={-1} className="mt-0! outline-none">
          {fill(m.summary.title, { type: typeLower })}
        </h2>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="font-label font-bold">{m.summary.items}</dt>
            {chosen.map((item) => (
              <dd key={item.id}>
                {draft.quantities[item.id]} × {item.title}
              </dd>
            ))}
          </div>
          <div>
            <dt className="font-label font-bold">{type === "WARRANTY" ? m.summary.description : m.summary.reason}</dt>
            <dd className="whitespace-pre-line">{draft.reason.trim() || m.summary.noReason}</dd>
          </div>
          {type === "WARRANTY" && (
            <>
              <div>
                <dt className="font-label font-bold">{m.form.photosLabel}</dt>
                <dd>{fill(m.summary.photos, { count: draft.photos.length })}</dd>
              </div>
              <div>
                <dt className="font-label font-bold">{m.summary.resolution}</dt>
                <dd>{draft.resolution && m.form.resolutions[draft.resolution]}</dd>
              </div>
            </>
          )}
        </dl>
        <p className="rounded-2xl bg-off-white p-4 text-base">{next}</p>
        {submitError && (
          <p role="alert" className={errorClassName}>
            {submitError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={confirm} loading={submitting} loadingText={common.loading}>
            {m.summary.confirm[type]}
          </Button>
          <Button variant="secondary" onClick={() => setStep("edit")} disabled={submitting}>
            {m.summary.edit}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="return-form-title" className={cardClassName}>
      <button type="button" onClick={onBack} className="self-start font-label text-base font-semibold text-medium-green underline underline-offset-2">
        {m.form.back}
      </button>
      <h2 id="return-form-title" ref={headingRef} tabIndex={-1} className="mt-0! outline-none">
        {m.start[type]}
      </h2>
      <p>{m.overview.actions[type]}</p>
      <form id="return-request" onSubmit={toSummary} noValidate className="flex flex-col gap-6">
        <fieldset aria-describedby={describedBy("items", "return-items-hint")} className="flex flex-col gap-3">
          <legend className="mb-2 font-label text-lg font-semibold">{m.form.itemsLegend}</legend>
          <p id="return-items-hint" className={hintClassName}>
            {m.form.itemsHint}
          </p>
          {eligible.map((item) => {
            const max = allowedQuantity(item.options, type);
            const checked = item.id in draft.quantities;
            return (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-off-white p-3">
                <label className="flex cursor-pointer items-start gap-3 text-base">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => toggle(item.id, event.target.checked)}
                    aria-invalid={errors.has("items") || undefined}
                    className="mt-1 size-5 shrink-0 cursor-pointer accent-medium-green"
                  />
                  <span>
                    <span className="block font-label font-bold text-medium-green">{item.title}</span>
                    <span className={hintClassName}>{m.overview.kinds[item.kind]}</span>
                  </span>
                </label>
                {checked && max > 1 && (
                  <QuantityStepper
                    quantity={draft.quantities[item.id]}
                    max={max}
                    size="small"
                    label={fill(m.form.quantityLabel, { title: item.title })}
                    onChange={(quantity) => set({ quantities: { ...draft.quantities, [item.id]: quantity } })}
                  />
                )}
              </div>
            );
          })}
          {fieldError("items", m.form.errors.items)}
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor="return-reason" className={labelClassName}>
            {type === "WARRANTY" ? m.form.descriptionLabel : m.form.reasonLabel}
          </Label>
          <Textarea
            id="return-reason"
            rows={4}
            maxLength={MAX_RETURN_REASON_LENGTH}
            value={draft.reason}
            onChange={(event) => set({ reason: event.target.value })}
            aria-invalid={errors.has("reason") || undefined}
            aria-describedby={describedBy("reason", "return-reason-hint")}
            className="text-base md:text-lg"
          />
          <p id="return-reason-hint" className={hintClassName}>
            {type === "WARRANTY" ? m.form.descriptionHint : m.form.reasonHint}
          </p>
          {fieldError("reason", fill(m.form.errors.description, { min: MIN_WARRANTY_DESCRIPTION_LENGTH }))}
        </div>

        {type === "WARRANTY" && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="return-photos" className={labelClassName}>
                {m.form.photosLabel}
              </Label>
              <p id="return-photos-hint" className={hintClassName}>
                {fill(m.form.photosHint, { min: MIN_RETURN_PHOTOS, max: MAX_RETURN_PHOTOS, size: MAX_PHOTO_SIZE_LABEL })}
              </p>
              {draft.photos.length > 0 && (
                <div role="list" className="flex flex-wrap gap-3">
                  {draft.photos.map((file, index) => (
                    <div role="listitem" key={photoUrls[index]} className="relative">
                      {/* A local preview of the chosen file (blob: URL), not for next/image. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrls[index]} alt="" className="size-20 rounded-xl object-cover" />
                      <button
                        type="button"
                        onClick={() => set({ photos: draft.photos.filter((_, other) => other !== index) })}
                        aria-label={fill(m.form.removePhoto, { index: index + 1 })}
                        className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-medium-green font-bold text-off-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {draft.photos.length < MAX_RETURN_PHOTOS && (
                <input
                  id="return-photos"
                  type="file"
                  multiple
                  accept={[...ALLOWED_IMAGE_TYPES, ...ACCEPTED_PHOTO_EXTENSIONS].join(",")}
                  onChange={(event) => {
                    addPhotos(event.target.files);
                    event.target.value = "";
                  }}
                  aria-invalid={errors.has("photos") || undefined}
                  aria-describedby={describedBy("photos", "return-photos-hint")}
                  className="text-base file:mr-3 file:cursor-pointer file:rounded-pill file:border-[1.5px] file:border-medium-green file:bg-white file:px-4 file:py-2 file:font-label file:font-semibold file:text-medium-green"
                />
              )}
              {photoError && (
                <p role="alert" className={errorClassName}>
                  {photoError}
                </p>
              )}
              {fieldError("photos", fill(m.form.errors.photos, { min: MIN_RETURN_PHOTOS, max: MAX_RETURN_PHOTOS }))}
            </div>

            <ChoiceChips
              legend={m.form.resolutionLegend}
              name="return-resolution"
              options={RETURN_RESOLUTIONS.map((value) => ({ value, label: m.form.resolutions[value] }))}
              value={draft.resolution}
              onChange={(resolution) => set({ resolution })}
              error={errors.has("resolution") ? m.form.errors.resolution : undefined}
            />

            <div className="flex flex-col gap-2 rounded-2xl bg-off-white p-4">
              <p className="font-label font-bold">{m.form.notCoveredTitle}</p>
              <div role="list" className="flex flex-col gap-1 text-sm">
                {m.form.notCovered.map((line) => (
                  <p role="listitem" key={line}>
                    · {line}
                  </p>
                ))}
              </div>
              {eligible.some((item) => item.kind === "personalized") && <p className={hintClassName}>{m.form.likenessNote}</p>}
            </div>
          </>
        )}

        <Button type="submit" variant="primary" className="self-start">
          {m.form.continue}
        </Button>
      </form>
    </section>
  );
}
