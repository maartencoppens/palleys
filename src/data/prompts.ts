// De prompts voor Nano Banana Pro: één algemene, en per dier een volledige eigen prompt. Een dier zonder eigen prompt
// (bv. een nieuw dier) gebruikt de algemene. Dit zijn de startwaarden; de echte staan in /admin/settings/prompts.
// Aanpassen = nieuwe poses testen.

export const MAX_PROMPT_LENGTH = 10_000;
export const MAX_ANIMAL_PROMPT_LENGTH = 2_000;

export const POSE_PROMPT = `
Photorealistic 3D-rendered recreation of the exact animal shown in the attached reference photos. This is not a redesign or reinterpretation — preserve the animal's real color pattern, markings, patch shapes, face structure, ear shape and size, snout or muzzle length, and body proportions exactly as seen in the reference photos.

The one or more attached photos all show this same single animal, possibly from different angles, distances and lighting conditions. Combine them into one consistent animal: use each photo for the details it shows most clearly, such as the face from a close-up and the markings on the back or sides from a full-body shot. When photos seem to disagree on color, trust the photo with the most neutral daylight lighting. Ignore backgrounds, people, collars, harnesses, clothing and any other animals in the photos.

Reposition this same animal into a relaxed resting pose natural for this species, lying low with its chest and belly resting flat on the ground, as much of the underside as possible touching the ground. Front legs extended forward or tucked as appropriate, hind legs tucked close to or under the body, tail (if this species has a visible one) resting against or curled close to the body, shown in a three-quarter view from the front-left, with the head turned toward the camera, so the face and the full body are both clearly visible, at eye-level, centered on a pure white background, no shadow.

Rendering style: realistic 3D character render, similar to a high-quality 3D-scanned figurine — true-to-life fur texture simplified into smooth sculpted clumps, natural anatomical proportions, soft realistic studio lighting with visible shading gradients and highlights to convey volume and form. No whiskers, and no individual hairs or fur strands extending beyond the silhouette.

Color palette limited to at most 6 flat colors: black and white always included, plus the colors matching the reference photos' actual dominant coat tones best. No gradients or extra shades beyond these 6 colors, but keep shading/highlights within each color zone for volume.

Maintain the exact same facial identity and coat pattern as the reference photos — same eye color and shape, same nose color, same ear shape, same markings in the same locations. Do not invent, remove, or relocate any markings. Markings that are only visible in one of the photos must still be included in that same location. Do not change the breed or body type.

All parts must be solid, filled-in, rounded shapes with no hollows, cavities, gaps or thin shells. Ears, tail and paws must be thick and solid. The inner ear is shown as a flat color area on a solid ear, not as a hollow. Use chunky, slightly simplified proportions, with legs and tail merged closely against the body and no open gaps between them. Natural, correct anatomy, clean closed silhouette with no thin protruding parts, and a wide, flat, stable base where the underside of the body rests on the ground. Orthographic camera angle, high detail on facial features.
`;

// Wat we per soort al weten, op diercode. Komt achter de algemene prompt in de startprompt van dat dier.
const SPECIES_NOTES: Record<string, string> = {
  KAT: "The animal is a cat. Keep the tail thick and wrapped closely around the body, with the paws tucked in. Ears are thick, solid triangles.",
  HOND: "The animal is a dog. Keep the breed's real ear shape (floppy or upright) but thick and solid, and the tail thick and resting against the body or hind legs.",
  SCHILDPAD: "The animal is a tortoise. The shell is one solid, closed dome with its real pattern; the head and legs are short, thick and close to the shell. There is no fur and no visible tail.",
  CAVIA: "The animal is a guinea pig. It has no visible tail. The body is a compact, rounded loaf shape with small, thick ears and the feet hidden underneath.",
  HAMSTER: "The animal is a hamster. It has no visible tail. The body is round and compact, with small, thick ears and the paws tucked under the body.",
  KONIJN: "The animal is a rabbit. It has no visible tail from this angle: do not add one. The ears are long but thick and solid, lying back along the head and back, with no gap between ear and body.",
  MUIS: "The animal is a mouse. Make the tail thick and short enough to stay solid, curled tightly against the side of the body. Ears are round, thick discs.",
  RAT: "The animal is a rat. Make the tail thick and solid, curled tightly against the side of the body instead of sticking out. Ears are round, thick discs.",
  KAMELEON: "The animal is a chameleon. It has smooth scaled skin, not fur. Its curled tail stays thick and pressed against the body, the legs short and gripping the ground, no thin toes.",
  SLANG: "The animal is a snake. It has no legs and no ears. The body is coiled in a compact, flat spiral resting on the ground, thick enough everywhere, with the head resting on top of the coils.",
  EGEL: "The animal is a hedgehog. The spines are one solid, textured mass on the back, never separate thin spikes. The face and belly are fur, the feet hidden underneath.",
};

/** The starting prompt per animal code: the general prompt with what we know about the species. */
export const DEFAULT_ANIMAL_PROMPTS: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIES_NOTES).map(([code, note]) => [code, `${POSE_PROMPT.trim()}\n\nSpecies-specific instructions: ${note}`]),
);

