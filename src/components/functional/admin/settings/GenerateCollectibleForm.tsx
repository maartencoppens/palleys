"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AnimalOption } from "@/core/modules/animals/types";
import { postGenerateCollectible } from "@/core/modules/collectibles/api";
import { postGeneratePose, uploadAdminPhoto, uploadPose } from "@/core/modules/previews/api";
import { posePrompt } from "@/core/modules/previews/utils";
import type { PromptSettings } from "@/core/modules/settings/types";
import { getApiErrorMessage } from "@/core/networking/api";
import { Textarea } from "@/components/design/form";
import { ALLOWED_IMAGE_TYPES, MAX_PHOTOS_PER_PREVIEW, MAX_UPLOAD_BYTES } from "@/data/uploads";
import { fieldLabelClassName, SaveBar, SettingsCard } from "./SettingsParts";

const GENERAL = "";
type Start = "photos" | "pose";

const selectClassName =
  "mt-2 h-11 w-full rounded-[15px] bg-off-white-dark px-4 font-label text-base font-semibold text-medium-green outline-none focus-visible:ring-3 focus-visible:ring-accent-highlights sm:w-80";
const fileClassName =
  "mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border-[1.5px] file:border-medium-green file:bg-white file:px-4 file:py-2 file:font-label file:font-semibold file:text-medium-green";

type GenerateCollectibleFormProps = {
  prompts: PromptSettings;
  /** The animals of the personalised Palley, whose prompts can be the starting point. */
  animals: AnimalOption[];
};

/*
 * A new collectible's model, apart from any order. It starts from photos (the pose is made right away with the chosen
 * prompt) or from a pose made elsewhere (straight to the 3D model). Either way the admin lands on the preview page.
 */
export function GenerateCollectibleForm({ prompts, animals }: GenerateCollectibleFormProps) {
  const router = useRouter();
  const [animalType, setAnimalType] = useState(GENERAL);
  const [prompt, setPrompt] = useState(prompts.base);
  const [start, setStart] = useState<Start>("photos");
  const [photos, setPhotos] = useState<File[]>([]);
  const [pose, setPose] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choosePrompt(code: string) {
    setAnimalType(code);
    setPrompt(posePrompt(prompts, code || null));
  }

  function problem() {
    if (!prompt.trim()) return "Vul de prompt in";
    const files = start === "pose" ? (pose ? [pose] : []) : photos;
    if (files.length === 0) return start === "pose" ? "Kies de pose" : "Voeg minstens één foto toe";
    if (files.length > MAX_PHOTOS_PER_PREVIEW) return `Maximaal ${MAX_PHOTOS_PER_PREVIEW} foto's`;
    if (files.some((file) => file.size > MAX_UPLOAD_BYTES)) return "Een van de bestanden is groter dan 10 MB";
    return null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const refused = problem();
    if (refused) return setError(refused);

    setStatus("Starten…");
    let previewId: string | null = null;
    try {
      ({ previewId } = await postGenerateCollectible({ animalType: animalType || null, prompt }));
      if (start === "pose") {
        setStatus("Pose uploaden…");
        await uploadPose(previewId, pose!);
      } else {
        for (const [index, photo] of photos.entries()) {
          setStatus(`Foto ${index + 1} van ${photos.length} uploaden…`);
          await uploadAdminPhoto(previewId, photo);
        }
        setStatus("Pose maken… (kan een minuut duren)");
        await postGeneratePose(previewId);
      }
      router.push(`/admin/previews/${previewId}`);
    } catch (e) {
      // Once the preview exists nothing is lost: its page shows what's missing (a photo, a pose, a new try).
      if (previewId) return router.push(`/admin/previews/${previewId}`);
      setError(getApiErrorMessage(e));
      setStatus(null);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <SettingsCard
        title="Prompt"
        intro="Begin van de algemene prompt of van die van een dier, en pas hem aan voor dit ene model. De instellingen blijven zoals ze zijn; op de preview kun je hem nog bijstellen."
      >
        <label htmlFor="generate-prompt-from" className={fieldLabelClassName}>
          Prompt van
        </label>
        <select
          id="generate-prompt-from"
          value={animalType}
          onChange={(event) => choosePrompt(event.target.value)}
          className={selectClassName}
        >
          <option value={GENERAL}>Algemene prompt</option>
          {animals.map((animal) => (
            <option key={animal.code} value={animal.code}>
              {animal.labels.nl}
            </option>
          ))}
        </select>
        <Textarea
          id="generate-prompt"
          aria-label="Prompt"
          rows={14}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="mt-4 min-h-72 font-mono text-sm!"
        />
      </SettingsCard>

      <SettingsCard title="Beginnen met">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Beginnen met</legend>
          <label className="flex cursor-pointer items-start gap-3 text-base">
            <input type="radio" name="start" checked={start === "photos"} onChange={() => setStart("photos")} className="mt-1 size-5 accent-medium-green" />
            <span>
              <span className="font-semibold">Foto&apos;s van het dier</span>
              <span className="block text-sm text-text-muted">Tot {MAX_PHOTOS_PER_PREVIEW} foto&apos;s; de pose wordt meteen gemaakt met de prompt hierboven.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-base">
            <input type="radio" name="start" checked={start === "pose"} onChange={() => setStart("pose")} className="mt-1 size-5 accent-medium-green" />
            <span>
              <span className="font-semibold">Ik heb al een pose</span>
              <span className="block text-sm text-text-muted">
                Een afbeelding zoals Nano Banana ze maakt. Je gaat meteen naar de preview om er een 3D-model van te maken.
              </span>
            </span>
          </label>
        </fieldset>

        {start === "photos" ? (
          <>
            <label htmlFor="generate-photos" className={`mt-5 block ${fieldLabelClassName}`}>
              Foto&apos;s
            </label>
            <input
              id="generate-photos"
              type="file"
              multiple
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              onChange={(event) => setPhotos(Array.from(event.target.files ?? []))}
              className={fileClassName}
            />
          </>
        ) : (
          <>
            <label htmlFor="generate-pose" className={`mt-5 block ${fieldLabelClassName}`}>
              Pose
            </label>
            <input
              id="generate-pose"
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              onChange={(event) => setPose(event.target.files?.[0] ?? null)}
              className={fileClassName}
            />
          </>
        )}
      </SettingsCard>

      {status && (
        <p role="status" className="text-base font-semibold text-medium-green">
          {status}
        </p>
      )}
      <SaveBar saving={status !== null} message={null} error={error} label={start === "pose" ? "Naar het 3D-model" : "Model genereren"} />
    </form>
  );
}
