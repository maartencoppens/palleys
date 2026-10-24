// Instellingen van de AI-pipeline. Wijzigingen hier veranderen de kost per preview.

export const MAX_POSE_ATTEMPTS = 3;

// Nano Banana Pro (Gemini). Hogere imageSize = duurder per pose.
export const POSE_IMAGE_CONFIG = {
  aspectRatio: "1:1",
  imageSize: "1K",
} as const;

// Meshy image-to-3D. glb voor de viewer, obj (+ mtl) voor de printer.
export const MESHY_TASK_OPTIONS = {
  ai_model: "latest",
  target_formats: ["glb", "obj"],
};

export const MAX_MODEL_BYTES = 100 * 1024 * 1024;
