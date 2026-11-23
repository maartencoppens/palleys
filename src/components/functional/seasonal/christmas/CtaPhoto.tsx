import { getMessages } from "@/core/locale/server";
import { ChristmasPalleyPhoto } from "./PalleyPhoto";

/** The Christmas Palley in the "Maak je Palley" CTA card, instead of the normal photo. */
export async function ChristmasCtaPhoto() {
  const { seasons } = await getMessages();
  return (
    <ChristmasPalleyPhoto
      alt={seasons.christmas.feature.photoAlt}
      sizes="(min-width: 1024px) 560px, 100vw"
      className="object-[52%_55%]"
    />
  );
}
