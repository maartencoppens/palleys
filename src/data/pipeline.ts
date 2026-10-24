// Instellingen van de AI-pipeline. Wijzigingen hier veranderen de kost per preview.

export const MAX_POSE_ATTEMPTS = 3;

// Nano Banana Pro (Gemini). Hogere imageSize = duurder per pose.
export const POSE_IMAGE_CONFIG = {
  aspectRatio: "1:1",
  imageSize: "1K",
} as const;

// Meshy image-to-3D. glb voor de viewer, obj (+ mtl) voor de printer.
export const MESHY_TASK_OPTIONS = {
  ai_model: "meshy-7.1",
  should_remesh: true,
  target_polycount: 150_000, // Meshy laat 100 tot 300.000 toe
  target_formats: ["glb", "obj"],
};

export const MAX_MODEL_BYTES = 100 * 1024 * 1024;

// Foto's worden verkleind voor ze naar Gemini gaan: de API heeft een limiet
// op de totale grootte van een request, en grotere foto's maken de pose niet beter.
export const GEMINI_INPUT_MAX_PX = 1536;
export const GEMINI_INPUT_JPEG_QUALITY = 90;
