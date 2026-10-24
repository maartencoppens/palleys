import "server-only";
import { timingSafeEqual } from "node:crypto";
import axios from "axios";
import { env } from "@/core/utils/env";
import { MAX_MODEL_BYTES, MESHY_TASK_OPTIONS } from "@/data/pipeline";

const BASE_URL = "https://api.meshy.ai/openapi/v1";

const meshy = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Bearer ${env.MESHY_API_KEY}` },
  timeout: 30_000,
});

export type MeshyTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

export type MeshyTask = {
  id: string;
  status: MeshyTaskStatus;
  progress?: number;
  model_urls?: { glb?: string; obj?: string; mtl?: string };
  texture_urls?: { base_color?: string }[];
  task_error?: { message?: string };
};

export class MeshyError extends Error {}
export class MeshyWebhookAuthError extends Error {}

export function isFinishedStatus(status: string) {
  return status !== "PENDING" && status !== "IN_PROGRESS";
}

function toMeshyError(error: unknown, action: string) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? "no response";
    const message = error.response?.data?.message ?? error.message;
    return new MeshyError(`Meshy ${action} failed (${status}): ${message}`);
  }
  return error;
}

function webhookUrl() {
  const url = new URL("/api/webhooks/meshy", env.APP_URL);
  url.searchParams.set("token", env.MESHY_WEBHOOK_SECRET);
  return url.toString();
}

export function assertValidWebhookToken(token: string) {
  const expected = Buffer.from(env.MESHY_WEBHOOK_SECRET);
  const received = Buffer.from(token);
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    throw new MeshyWebhookAuthError("Invalid Meshy webhook token");
  }
}

export async function createImageTo3dTask(input: {
  image: Buffer;
  mimeType: string;
}): Promise<string> {
  try {
    const res = await meshy.post<{ result: string }>("/image-to-3d", {
      ...MESHY_TASK_OPTIONS,
      image_url: `data:${input.mimeType};base64,${input.image.toString("base64")}`,
      webhook_url: webhookUrl(),
    });
    return res.data.result;
  } catch (error) {
    throw toMeshyError(error, "create task");
  }
}

export type ModelFileUrls = {
  glb: string;
  obj: string;
  mtl: string;
  texture: string;
};

// Haalt de vier bestanden uit een geslaagde taak die wij nodig hebben.
// null als er één ontbreekt: zonder MTL of textuur is er geen kleurenprint.
export function getModelFileUrls(task: MeshyTask): ModelFileUrls | null {
  const glb = task.model_urls?.glb;
  const obj = task.model_urls?.obj;
  const mtl = task.model_urls?.mtl;
  const texture = task.texture_urls?.[0]?.base_color;
  if (!glb || !obj || !mtl || !texture) return null;
  return { glb, obj, mtl, texture };
}

export async function getImageTo3dTask(taskId: string): Promise<MeshyTask> {
  try {
    const res = await meshy.get<MeshyTask>(
      `/image-to-3d/${encodeURIComponent(taskId)}`,
    );
    return res.data;
  } catch (error) {
    throw toMeshyError(error, "get task");
  }
}

export async function downloadModel(url: string): Promise<Buffer> {
  try {
    // Gewone axios, niet de meshy-instance: dit is een signed opslag-URL
    // en daar hoort onze API-key niet bij.
    const res = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      timeout: 120_000,
      maxContentLength: MAX_MODEL_BYTES,
    });
    return Buffer.from(res.data);
  } catch (error) {
    throw toMeshyError(error, "model download");
  }
}

export async function resizeModel(input: {
  inputTaskId: string;
  longestSideMeters: number;
}): Promise<string> {
  try {
    const res = await meshy.post<{ result: string }>("/resize", {
      resize_longest_side: input.longestSideMeters,
      input_task_id: input.inputTaskId,
      webhook_url: webhookUrl(),
    });
    return res.data.result;
  } catch (error) {
    throw toMeshyError(error, "create task");
  }
}
