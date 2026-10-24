import "server-only";
import { env } from "@/core/utils/env";
import axios from "axios";
import { POSE_PROMPT } from "@/data/prompts";
import { POSE_IMAGE_CONFIG } from "@/data/pipeline";

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
      imageConfig: POSE_IMAGE_CONFIG,
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
