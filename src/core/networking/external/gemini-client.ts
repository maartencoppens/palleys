import "server-only";
import { env } from "@/core/utils/env";
import axios from "axios";

type GeminiPart = {
  text?: string;
  thought?: boolean;
  inlineData?: { mimeType: string; data: string };
};

type GeminiResponse = {
  candidates?: {
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
};

const POSE_PROMPT = `Photorealistic 3D-rendered recreation of the exact animal shown in the
attached reference photo. This is not a redesign or reinterpretation —
preserve the pet's real fur color pattern, markings, patch shapes,
face structure, ear shape and size, snout length, and body proportions
exactly as seen in the reference photo.

Reposition this same animal into a relaxed sphinx-like lying pose, legs
tucked under the body, tail curled close against the body, viewed from
the front at eye-level, centered on a pure
white background, no shadow.

Rendering style: realistic 3D character render, similar to a high-quality
3D-scanned figurine — true-to-life fur texture simplified into smooth
sculpted clumps, natural anatomical proportions, soft realistic studio
lighting with visible shading gradients and highlights to convey volume
and form.

Color palette limited to exactly 4 flat colors: black and white always
included, plus the two colors matching the reference photo's actual dominant coat tones best.
No gradients or extra shades beyond these 4 colors, but keep shading/
highlights within each color zone for volume.

Maintain the exact same facial identity and coat pattern as the reference
photo — same eye color and shape, same nose color, same ear shape, same
markings in the same locations. Do not invent, remove, or relocate any
markings. Do not change the breed or body type.

Clean closed silhouette, no thin protruding parts, symmetrical anatomy,
orthographic camera angle, high detail on facial features and proportions.`;

const GEMINI_API_KEY = env.GEMINI_API_KEY;
const GEMINI_MODEL = env.GEMINI_MODEL;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const gemini = axios.create({
  baseURL: `${BASE_URL}`,
  headers: { "x-goog-api-key": GEMINI_API_KEY },
  timeout: 120_000,
});

export class PoseGenerationError extends Error {}

export async function generatePose(input: { image: Buffer; mimeType: string }) {
  const body = {
    contents: [
      {
        parts: [
          { text: POSE_PROMPT },
          {
            inline_data: {
              mime_type: input.mimeType,
              data: input.image.toString("base64"),
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
    },
  };

  let data: GeminiResponse;
  try {
    const res = await gemini.post<GeminiResponse>(
      `/models/${GEMINI_MODEL}:generateContent`,
      body,
    );
    data = res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message ?? error.message;
      throw new PoseGenerationError(
        `Gemini request failed (${status}): ${message}`,
      );
    }
    throw error;
  }

  const blockReason = data.promptFeedback?.blockReason;
  if (blockReason) {
    throw new PoseGenerationError(`Prompt blocked: ${blockReason}`);
  }

  const candidate = data.candidates?.[0];
  const imagePart = candidate?.content?.parts
    ?.filter((p) => p.inlineData && !p.thought)
    .at(-1);

  if (!imagePart?.inlineData) {
    throw new PoseGenerationError(
      `No image returned (finishReason: ${candidate?.finishReason ?? "unknown"})`,
    );
  }

  return {
    image: Buffer.from(imagePart.inlineData.data, "base64"),
    mimeType: imagePart.inlineData.mimeType,
  };
}
