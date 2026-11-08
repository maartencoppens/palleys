// De prompts voor Nano Banana Pro: één algemene, en per dier een volledige eigen prompt. Een dier zonder eigen prompt
// (bv. een nieuw dier) gebruikt de algemene. Dit zijn de startwaarden; de echte staan in /admin/settings/prompts.
// Aanpassen = nieuwe poses testen.

export const MAX_PROMPT_LENGTH = 10_000;
export const MAX_ANIMAL_PROMPT_LENGTH = 2_000;

export const POSE_PROMPT = `
Create a photorealistic 3D-rendered figurine of the exact animal in the attached reference photo. Show only the animal itself: no keychain, ring, loop, chain, stand or any other hardware.

LIKENESS (highest priority)
Keep the animal's real identity exactly: breed and body type, coat colors, marking shapes and positions, eye color and shape, nose color, ear shape and size, muzzle length, body proportions. Do not invent, remove, move or recolor any marking. If a part of the animal is not visible in the photo (other side, belly, back), complete it plausibly from typical anatomy and continue the visible coat colors, without adding distinctive new markings. If the animal wears a collar or harness, keep it, shown as a thick solid band molded onto the body in its real color. Leave out leashes, dangling tags, toys and other loose items.

POSE
Relaxed resting pose natural for this species, lying low with chest and belly flat on the ground and as much of the underside as possible touching it. Front legs tucked or extended slightly forward, hind legs tucked under the body, tail resting against or close to the body in its natural length and shape (short or bobbed tails stay short). Head turned toward the camera with a calm expression, so the face and the whole body are clearly visible.

CAMERA
Slight three-quarter view from the front-left, camera at the animal's eye level, neutral lens with minimal perspective distortion. The whole animal is centered and fully in frame, on a pure white background with no shadow, no ground and no props.

SHAPE
Compact, chunky and rounded, like a smooth sculpted figurine, with the legs, head and tail still clearly readable as separate anatomical parts. Limbs and tail lie tight against the body, separated at most by shallow grooves, never by open gaps or holes. Ears, tail and paws are thick, rounded and solid, never thin, pointed or hollow; the inner ear is a flat color area on a solid ear. Clean closed silhouette with nothing thin sticking out, and a wide, flat, stable base.

SURFACE AND COLOR
Fur is simplified into smooth sculpted clumps, with no individual hairs or strands, no whiskers and nothing extending past the silhouette. Use the true colors of the reference photo as clean color zones with the natural markings kept sharp. Soft studio lighting with gentle shading to show volume, without adding extra colors or noise.

STYLE
High-quality realistic 3D figurine render with slightly simplified proportions, high detail on the face and eyes.
`;

// Wat we per soort al weten, op diercode. Komt achter de algemene prompt in de startprompt van dat dier.
const SPECIES_NOTES: Record<string, string> = {
  KAT: "The animal is a cat. Keep the tail thick and wrapped closely around the body, with the paws tucked in. Ears are thick, solid triangles.",
  HOND: "The animal is a dog. Keep the breed's real ear shape (floppy or upright) but thick and solid, and the tail thick and resting against the body or hind legs.",
  SCHILDPAD:
    "The animal is a tortoise. The shell is one solid, closed dome with its real pattern; the head and legs are short, thick and close to the shell. There is no fur and no visible tail.",
  CAVIA:
    "The animal is a guinea pig. It has no visible tail. The body is a compact, rounded loaf shape with small, thick ears and the feet hidden underneath.",
  HAMSTER:
    "The animal is a hamster. It has no visible tail. The body is round and compact, with small, thick ears and the paws tucked under the body.",
  KONIJN:
    "The animal is a rabbit. It has no visible tail from this angle: do not add one. The ears are long but thick and solid, lying back along the head and back, with no gap between ear and body.",
  MUIS: "The animal is a mouse. Make the tail thick and short enough to stay solid, curled tightly against the side of the body. Ears are round, thick discs.",
  RAT: "The animal is a rat. Make the tail thick and solid, curled tightly against the side of the body instead of sticking out. Ears are round, thick discs.",
  KAMELEON:
    "The animal is a chameleon. It has smooth scaled skin, not fur. Its curled tail stays thick and pressed against the body, the legs short and gripping the ground, no thin toes.",
  SLANG:
    "The animal is a snake. It has no legs and no ears. The body is coiled in a compact, flat spiral resting on the ground, thick enough everywhere, with the head resting on top of the coils.",
  EGEL: "The animal is a hedgehog. The spines are one solid, textured mass on the back, never separate thin spikes. The face and belly are fur, the feet hidden underneath.",
};

/** The starting prompt per animal code: the general prompt with what we know about the species. */
export const DEFAULT_ANIMAL_PROMPTS: Record<string, string> =
  Object.fromEntries(
    Object.entries(SPECIES_NOTES).map(([code, note]) => [
      code,
      `${POSE_PROMPT.trim()}\n\nSpecies-specific instructions: ${note}`,
    ]),
  );
