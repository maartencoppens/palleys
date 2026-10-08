import "server-only";
import { randomUUID } from "node:crypto";
import { prisma, PreviewStatus } from "@/db/client";
import {
  createDownloadUrl,
  createUploadUrl,
  deleteObject,
  getObject,
  putObject,
} from "@/core/networking/external/storage-client";
import { generatePose as geminiGeneratePose } from "@/core/networking/external/gemini-client";
import {
  assertValidWebhookToken,
  createImageTo3dTask,
  downloadModel,
  getImageTo3dTask,
  isFinishedStatus,
} from "@/core/networking/external/meshy-client";
import {
  assertTransition,
  canTransition,
  InvalidTransitionError,
  statusesThatCanTransitionTo,
} from "./status";
import {
  glbKey,
  mimeTypeForKey,
  poseImageKey,
  toErrorMessage,
  unpaidExpiry,
} from "./utils";
import type {
  AdminDashboard,
  AdminPreviewDetail,
  AdminPreviewListItem,
  CreateUploadInput,
  PreviewActionResult,
} from "./types";
import { MAX_POSE_ATTEMPTS } from "@/data/pipeline";

const EXTENSIONS: Record<CreateUploadInput["contentType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
import { z } from "zod";

export class PreviewNotFoundError extends Error {}
export class PreviewConflictError extends Error {}

// Ruimt bestanden op die door een nieuw resultaat vervangen zijn.
// Mag de actie nooit laten mislukken: het nieuwe resultaat staat al in de database.
async function deleteReplacedFiles(keys: (string | null)[]) {
  await Promise.all(
    keys
      .filter((key): key is string => Boolean(key))
      .map(async (key) => {
        try {
          await deleteObject(key);
        } catch (err) {
          console.error(`Could not delete ${key}:`, toErrorMessage(err));
        }
      }),
  );
}

export async function createPreview(input: CreateUploadInput) {
  const id = randomUUID();
  const key = `previews/${id}/original.${EXTENSIONS[input.contentType]}`;
  const expiresAt = unpaidExpiry();

  await prisma.preview.create({
    data: { id, originalPhotoKey: key, expiresAt },
  });

  const uploadUrl = await createUploadUrl(key, input.contentType);
  return { previewId: id, uploadUrl, expiresAt: expiresAt.toISOString() };
}

export async function approvePreview(id: string) {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!preview) throw new PreviewNotFoundError();

  assertTransition(preview.status, PreviewStatus.APPROVED);

  // Alleen updaten als de status sinds het lezen niet veranderd is.
  const { count } = await prisma.preview.updateMany({
    where: { id, status: preview.status },
    data: { status: PreviewStatus.APPROVED },
  });
  if (count === 0) {
    throw new InvalidTransitionError(preview.status, PreviewStatus.APPROVED);
  }

  return { previewId: id, status: PreviewStatus.APPROVED };
}

export async function generatePose(id: string): Promise<PreviewActionResult> {
  const preview = await prisma.preview.findUnique({ where: { id } });
  if (!preview) throw new PreviewNotFoundError(id);

  assertTransition(preview.status, PreviewStatus.GENERATING_POSE);

  const originalKey = preview.originalPhotoKey;
  if (!originalKey) throw new PreviewConflictError("No original photo");
  if (preview.poseAttempts >= MAX_POSE_ATTEMPTS) {
    throw new PreviewConflictError("Max pose attempts reached");
  }

  const claimed = await prisma.preview.updateMany({
    where: { id, status: preview.status },
    data: {
      status: PreviewStatus.GENERATING_POSE,
      error: null,
      poseAttempts: { increment: 1 },
    },
  });
  if (claimed.count === 0) {
    throw new PreviewConflictError("Already being processed");
  }

  try {
    const original = await getObject(originalKey);
    const pose = await geminiGeneratePose({
      image: original,
      mimeType: mimeTypeForKey(originalKey),
    });

    const key = poseImageKey(id, pose.mimeType);
    await putObject(key, pose.image, pose.mimeType);

    // Een nieuwe pose maakt een bestaand model ongeldig.
    await prisma.preview.update({
      where: { id },
      data: {
        status: PreviewStatus.POSE_READY,
        poseImageKey: key,
        glbKey: null,
        meshyTaskId: null,
      },
    });
    await deleteReplacedFiles([preview.poseImageKey, preview.glbKey]);

    return { previewId: id, status: PreviewStatus.POSE_READY };
  } catch (err) {
    await prisma.preview.updateMany({
      where: { id, status: PreviewStatus.GENERATING_POSE },
      data: { status: PreviewStatus.FAILED, error: toErrorMessage(err) },
    });
    throw err;
  }
}

export async function startModelGeneration(
  id: string,
): Promise<PreviewActionResult> {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: { status: true, poseImageKey: true },
  });
  if (!preview) throw new PreviewNotFoundError(id);

  assertTransition(preview.status, PreviewStatus.GENERATING_MODEL);

  const poseKey = preview.poseImageKey;
  if (!poseKey) {
    throw new PreviewConflictError("No pose image to build a model from");
  }

  const claimed = await prisma.preview.updateMany({
    where: { id, status: preview.status },
    data: {
      status: PreviewStatus.GENERATING_MODEL,
      error: null,
      meshyTaskId: null,
    },
  });
  if (claimed.count === 0) {
    throw new PreviewConflictError("Already being processed");
  }

  try {
    const pose = await getObject(poseKey);
    const taskId = await createImageTo3dTask({
      image: pose,
      mimeType: mimeTypeForKey(poseKey),
    });
    await prisma.preview.update({
      where: { id },
      data: { meshyTaskId: taskId },
    });
    return { previewId: id, status: PreviewStatus.GENERATING_MODEL };
  } catch (err) {
    await prisma.preview.updateMany({
      where: { id, status: PreviewStatus.GENERATING_MODEL },
      data: { status: PreviewStatus.FAILED, error: toErrorMessage(err) },
    });
    throw err;
  }
}

const SYNC_SELECT = {
  id: true,
  status: true,
  meshyTaskId: true,
  glbKey: true,
} as const;

type SyncablePreview = {
  id: string;
  status: PreviewStatus;
  meshyTaskId: string | null;
  glbKey: string | null;
};

// Kern van de Meshy-flow: vraagt de taak op bij Meshy en verwerkt het resultaat.
// Wordt aangeroepen door de webhook én door de knop "Status ophalen".
async function syncModelTask(
  preview: SyncablePreview,
): Promise<PreviewActionResult> {
  const taskId = preview.meshyTaskId;
  const unchanged = { previewId: preview.id, status: preview.status };

  // Alleen previews die op Meshy wachten. Al de rest is al verwerkt
  // (bv. een dubbele webhook) en laten we met rust.
  if (preview.status !== PreviewStatus.GENERATING_MODEL || !taskId) {
    return unchanged;
  }

  // De bron van waarheid is Meshy zelf, niet de webhook-payload.
  const task = await getImageTo3dTask(taskId);
  if (!isFinishedStatus(task.status)) return unchanged;

  const lock = {
    id: preview.id,
    status: PreviewStatus.GENERATING_MODEL,
    meshyTaskId: taskId,
  };

  const glbUrl = task.model_urls?.glb;
  if (task.status !== "SUCCEEDED" || !glbUrl) {
    await prisma.preview.updateMany({
      where: lock,
      data: {
        status: PreviewStatus.FAILED,
        error:
          task.task_error?.message ||
          `Meshy task ended with status ${task.status}`,
      },
    });
    return { previewId: preview.id, status: PreviewStatus.FAILED };
  }

  // Vanaf hier: fouten in download of opslag zetten de preview NIET op FAILED.
  // De taak bij Meshy blijft geldig, dus een volgende sync kan het opnieuw proberen.
  const glb = await downloadModel(glbUrl);
  const key = glbKey(preview.id, taskId);
  await putObject(key, glb, "model/gltf-binary");

  const { count } = await prisma.preview.updateMany({
    where: lock,
    data: {
      status: PreviewStatus.MODEL_READY,
      glbKey: key,
      downloadedAt: null,
      downloadedBy: null,
    },
  });
  if (count === 0) return unchanged; // iemand anders was ons voor

  if (preview.glbKey !== key) await deleteReplacedFiles([preview.glbKey]);
  return { previewId: preview.id, status: PreviewStatus.MODEL_READY };
}

export async function syncModel(id: string): Promise<PreviewActionResult> {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: SYNC_SELECT,
  });
  if (!preview) throw new PreviewNotFoundError(id);
  if (
    preview.status !== PreviewStatus.GENERATING_MODEL ||
    !preview.meshyTaskId
  ) {
    throw new PreviewConflictError("No model generation in progress");
  }
  return syncModelTask(preview);
}

export async function handleMeshyWebhook(input: {
  token: string;
  taskId: string;
  status?: string;
}): Promise<PreviewActionResult | null> {
  assertValidWebhookToken(input.token);

  // Tussentijdse meldingen (voortgang) negeren we zonder Meshy te bevragen.
  if (input.status && !isFinishedStatus(input.status)) return null;

  const preview = await prisma.preview.findUnique({
    where: { meshyTaskId: input.taskId },
    select: SYNC_SELECT,
  });
  if (!preview) return null; // onbekende taak, bv. een oude testtaak
  return syncModelTask(preview);
}

function signedUrlOrNull(key: string | null) {
  return key ? createDownloadUrl(key) : Promise.resolve(null);
}

export async function getPreviewForAdmin(
  id: string,
): Promise<AdminPreviewDetail | null> {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      email: true,
      error: true,
      shopifyOrderId: true,
      createdAt: true,
      originalPhotoKey: true,
      poseImageKey: true,
      glbKey: true,
      poseAttempts: true,
      meshyTaskId: true,
    },
  });
  if (!preview) return null;

  const [originalPhotoUrl, poseImageUrl, glbUrl] = await Promise.all([
    signedUrlOrNull(preview.originalPhotoKey),
    signedUrlOrNull(preview.poseImageKey),
    signedUrlOrNull(preview.glbKey),
  ]);

  return {
    id: preview.id,
    status: preview.status,
    email: preview.email,
    error: preview.error,
    shopifyOrderId: preview.shopifyOrderId,
    createdAt: preview.createdAt.toISOString(),
    originalPhotoUrl,
    poseImageUrl,
    glbUrl,
    canApprove: canTransition(preview.status, PreviewStatus.APPROVED),
    canGeneratePose: canTransition(
      preview.status,
      PreviewStatus.GENERATING_POSE,
    ),
    poseAttemptsLeft: Math.max(0, MAX_POSE_ATTEMPTS - preview.poseAttempts),
    canStartModel:
      canTransition(preview.status, PreviewStatus.GENERATING_MODEL) &&
      preview.poseImageKey !== null,
    canSyncModel:
      preview.status === PreviewStatus.GENERATING_MODEL &&
      preview.meshyTaskId !== null,
  };
}

const REVIEW_LIST_LIMIT = 100;

const REVIEWABLE_STATUSES = [
  ...new Set([
    ...statusesThatCanTransitionTo(PreviewStatus.GENERATING_POSE),
    ...statusesThatCanTransitionTo(PreviewStatus.GENERATING_MODEL),
    ...statusesThatCanTransitionTo(PreviewStatus.MODEL_READY), // wacht op Meshy
    ...statusesThatCanTransitionTo(PreviewStatus.APPROVED),
  ]),
];

export async function listPreviewsForReview(): Promise<AdminPreviewListItem[]> {
  const previews = await prisma.preview.findMany({
    where: { status: { in: REVIEWABLE_STATUSES } },
    orderBy: { createdAt: "asc" },
    take: REVIEW_LIST_LIMIT,
    select: {
      id: true,
      status: true,
      email: true,
      error: true,
      createdAt: true,
    },
  });

  return previews.map((preview) => ({
    id: preview.id,
    status: preview.status,
    email: preview.email,
    error: preview.error,
    createdAt: preview.createdAt.toISOString(),
  }));
}

const APPROVED_STATUSES = [PreviewStatus.APPROVED, PreviewStatus.PRINT_READY];

export async function listApprovedModels() {
  const previews = await prisma.preview.findMany({
    where: { status: { in: APPROVED_STATUSES }, glbKey: { not: null } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      downloadedAt: true,
      downloadedBy: true,
    },
  });

  return previews.map((p) => ({
    id: p.id,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    downloadedAt: p.downloadedAt?.toISOString() ?? null,
    downloadedBy: p.downloadedBy,
  }));
}

// Markeert de modellen als gedownload en geeft een downloadlink per model terug.
export async function downloadModels(previewIds: string[], adminName: string) {
  const previews = await prisma.preview.findMany({
    where: {
      id: { in: previewIds },
      status: { in: APPROVED_STATUSES },
      glbKey: { not: null },
    },
    select: { id: true, glbKey: true },
  });

  await prisma.preview.updateMany({
    where: { id: { in: previews.map((p) => p.id) } },
    data: { downloadedAt: new Date(), downloadedBy: adminName },
  });

  return Promise.all(
    previews.map(async (p) => ({
      previewId: p.id,
      url: await createDownloadUrl(
        p.glbKey!,
        `palleys-${p.id.slice(0, 8)}.glb`,
      ),
    })),
  );
}

const SEARCH_LIMIT = 20;

// Alles voor de dashboardpagina in één aanroep: tellingen + zoekresultaten.
export async function getAdminDashboard(query = ""): Promise<AdminDashboard> {
  const q = query.trim();

  const [byStatus, toDownload, results] = await Promise.all([
    prisma.preview.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.preview.count({
      where: {
        status: { in: APPROVED_STATUSES },
        glbKey: { not: null },
        downloadedAt: null,
      },
    }),
    q ? searchPreviews(q) : Promise.resolve([]),
  ]);

  const countOf = (statuses: PreviewStatus[]) =>
    byStatus
      .filter((row) => statuses.includes(row.status))
      .reduce((sum, row) => sum + row._count._all, 0);

  return {
    stats: {
      toReview: countOf(REVIEWABLE_STATUSES),
      toDownload,
      failed: countOf([PreviewStatus.FAILED]),
      approved: countOf(APPROVED_STATUSES),
    },
    query: q,
    results,
  };
}

// Zoekt op preview-id (exact), e-mail of Shopify-ordernummer (deel van).
async function searchPreviews(q: string): Promise<AdminPreviewListItem[]> {
  const isId = z.uuid().safeParse(q).success;

  const previews = await prisma.preview.findMany({
    where: isId
      ? { id: q }
      : {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { shopifyOrderId: { contains: q } },
          ],
        },
    orderBy: { createdAt: "desc" },
    take: SEARCH_LIMIT,
    select: {
      id: true,
      status: true,
      email: true,
      error: true,
      createdAt: true,
    },
  });

  return previews.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }));
}
