import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { prisma, PreviewStatus } from "@/db/client";
import { findAnimalByCode } from "@/core/modules/animals/utils";
import {
  createDownloadUrl,
  createUploadUrl,
  deleteObject,
  getObject,
  putObject,
  objectExists,
} from "@/core/networking/external/storage-client";
import { generatePose as geminiGeneratePose } from "@/core/networking/external/gemini-client";
import {
  assertValidWebhookToken,
  createImageTo3dTask,
  downloadModel,
  getImageTo3dTask,
  getModelFileUrls,
  isFinishedStatus,
} from "@/core/networking/external/meshy-client";
import {
  assertTransition,
  canTransition,
  InvalidTransitionError,
  statusesThatCanTransitionTo,
} from "./status";
import {
  mimeTypeForKey,
  modelKeys,
  poseImageKey,
  paidOrderNumber,
  PRINT_NAME_SELECT,
  printBaseName,
  toErrorMessage,
  unpaidExpiry,
  isPhotoKeyOf,
  photoKey,
  posePrompt,
} from "./utils";
import { getShopSettings } from "@/core/modules/settings/service";
import { activeQuantity } from "@/core/modules/orders/check-in";
import { startProductionForPreview } from "@/core/modules/orders/production";
import { OPEN_RETURN_STATUSES } from "@/core/modules/returns/status";
import type {
  AdminDashboard,
  AdminPreviewDetail,
  AdminPreviewListItem,
  CreateUploadInput,
  PrintDownload,
  PreviewActionResult,
  PhotoInput,
  ReviewListItem,
  MeshyProgress,
  StatusOverrideInput,
} from "./types";

import { MAX_PHOTOS_PER_PREVIEW } from "@/data/uploads";

import { z } from "zod";
import { parsePreviewRef } from "@/core/utils/naming";
import { MAX_POSE_ATTEMPTS, MAX_UPLOADED_POSES } from "@/data/pipeline";
import { REVIEW_LIST_LIMIT, SEARCH_LIMIT } from "@/data/admin";

export class PreviewNotFoundError extends Error {}
export class PreviewConflictError extends Error {}

// Ruimt bestanden op die door een nieuw resultaat vervangen zijn.
// Mag de actie nooit laten mislukken: het nieuwe resultaat staat al in de database.
// Alle bestanden van één 3D-model: de GLB voor de viewer + de printbestanden.
type ModelFileKeys = {
  glbKey: string | null;
  objKey: string | null;
  mtlKey: string | null;
  textureKey: string | null;
};

const NO_MODEL: ModelFileKeys = {
  glbKey: null,
  objKey: null,
  mtlKey: null,
  textureKey: null,
};

function modelKeyList(model: ModelFileKeys) {
  return [model.glbKey, model.objKey, model.mtlKey, model.textureKey];
}

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

// Maakt de preview aan met een rij per foto, en geeft per foto een signed
// upload-URL terug in dezelfde volgorde als de input.
export async function createPreview(input: CreateUploadInput) {
  const id = randomUUID();
  const expiresAt = unpaidExpiry();
  const photos = input.photos.map((photo) => ({
    key: photoKey(id, photo.contentType),
    contentType: photo.contentType,
  }));

  await prisma.preview.create({
    data: {
      id,
      expiresAt,
      photos: { create: photos.map((photo) => ({ key: photo.key })) },
    },
  });

  const uploadUrls = await Promise.all(
    photos.map((photo) => createUploadUrl(photo.key, photo.contentType)),
  );
  return { previewId: id, uploadUrls, expiresAt: expiresAt.toISOString() };
}

async function countPhotos(id: string) {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: { _count: { select: { photos: true } } },
  });
  if (!preview) throw new PreviewNotFoundError(id);
  return preview._count.photos;
}

const TOO_MANY_PHOTOS = `Maximum ${MAX_PHOTOS_PER_PREVIEW} foto's per preview`;

// Stap 1 van een upload door de admin: alleen een signed URL, nog geen rij.
// De rij komt pas in confirmPhotoUpload, als het bestand echt in R2 staat.
export async function createPhotoUpload(id: string, input: PhotoInput) {
  if ((await countPhotos(id)) >= MAX_PHOTOS_PER_PREVIEW) {
    throw new PreviewConflictError(TOO_MANY_PHOTOS);
  }
  const key = photoKey(id, input.contentType);
  const uploadUrl = await createUploadUrl(key, input.contentType);
  return { key, uploadUrl };
}

// Stap 2: de browser heeft geüpload, wij controleren en slaan de foto op.
export async function confirmPhotoUpload(
  id: string,
  key: string,
  adminName: string,
) {
  if (!isPhotoKeyOf(id, key)) throw new PreviewConflictError("Ongeldige key");

  if ((await countPhotos(id)) >= MAX_PHOTOS_PER_PREVIEW) {
    await deleteReplacedFiles([key]); // te veel: geüpload bestand opruimen
    throw new PreviewConflictError(TOO_MANY_PHOTOS);
  }
  if (!(await objectExists(key))) {
    throw new PreviewConflictError("Upload niet gevonden, probeer opnieuw");
  }

  const photo = await prisma.previewPhoto.upsert({
    where: { key }, // twee keer bevestigen maakt geen tweede rij
    create: { previewId: id, key, uploadedBy: adminName },
    update: {},
  });
  return { photoId: photo.id };
}

// Er blijft altijd minstens één foto over, anders kan er geen pose meer
// gemaakt worden. Dus: eerst de nieuwe uploaden, dan de slechte verwijderen.
export async function deletePhoto(id: string, photoId: string) {
  const photo = await prisma.previewPhoto.findFirst({
    where: { id: photoId, previewId: id },
    select: { key: true },
  });
  if (!photo) throw new PreviewNotFoundError(photoId);

  if ((await countPhotos(id)) <= 1) {
    throw new PreviewConflictError(
      "De laatste foto kan niet verwijderd worden. Upload eerst een nieuwe.",
    );
  }

  await prisma.previewPhoto.delete({ where: { id: photoId } });
  await deleteReplacedFiles([photo.key]); // klantfoto: ook uit R2 weg (GDPR)
  return { photoId };
}

// Noodknop: zet de status zonder state machine en logt wie, wanneer en waarom.
// Raakt verder niets aan (bestanden, Meshy-taak, ...): dat blijft zoals het is.
export async function overrideStatus(
  id: string,
  input: StatusOverrideInput,
  adminName: string,
) {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!preview) throw new PreviewNotFoundError(id);
  if (preview.status === input.status) {
    throw new PreviewConflictError("De preview heeft deze status al");
  }

  await prisma.$transaction([
    prisma.preview.update({ where: { id }, data: { status: input.status } }),
    prisma.previewStatusChange.create({
      data: {
        previewId: id,
        fromStatus: preview.status,
        toStatus: input.status,
        reason: input.reason,
        changedBy: adminName,
      },
    }),
  ]);
  return { previewId: id, status: input.status };
}

/**
 * Once the model is approved the pose is settled: the other attempts are made from the customer's photos and have no use
 * any more, so they go (rows and files). The chosen one stays until the retention removes it with the photos.
 */
async function deleteUnchosenPoses(id: string) {
  const { poseImageKey } = await prisma.preview.findUniqueOrThrow({ where: { id }, select: { poseImageKey: true } });
  const others = await prisma.poseCandidate.findMany({
    where: { previewId: id, ...(poseImageKey ? { key: { not: poseImageKey } } : {}) },
    select: { id: true, key: true },
  });
  if (others.length === 0) return;
  await prisma.poseCandidate.deleteMany({ where: { id: { in: others.map((other) => other.id) } } });
  await deleteReplacedFiles(others.map((other) => other.key));
}

export async function approvePreview(id: string) {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: { status: true, animalType: true, forCollectible: true },
  });
  if (!preview) throw new PreviewNotFoundError();

  assertTransition(preview.status, PreviewStatus.APPROVED);
  // Het diersoort staat in de bestandsnaam van de print: eerst kiezen. Een collectible mag zonder (geen dier uit de lijst).
  if (!preview.animalType && !preview.forCollectible) {
    throw new PreviewConflictError("Choose an animal type before approving");
  }
  // Alleen updaten als de status sinds het lezen niet veranderd is.
  const { count } = await prisma.preview.updateMany({
    where: { id, status: preview.status },
    data: { status: PreviewStatus.APPROVED },
  });
  if (count === 0) {
    throw new InvalidTransitionError(preview.status, PreviewStatus.APPROVED);
  }
  await deleteUnchosenPoses(id);

  return { previewId: id, status: PreviewStatus.APPROVED };
}

// Mag in elke status: ook na goedkeuring kan een vergissing rechtgezet worden.
export async function setAnimalType(id: string, animalType: string) {
  const { catalog } = await getShopSettings();
  if (!findAnimalByCode(catalog.animals, animalType)) throw new PreviewConflictError("Dit dier staat niet in de lijst");
  const { count } = await prisma.preview.updateMany({
    where: { id },
    data: { animalType },
  });
  if (count === 0) throw new PreviewNotFoundError(id);
  return { previewId: id, animalType };
}

export class InvalidPoseImageError extends Error {}

const TOO_MANY_POSE_UPLOADS = `Maximum ${MAX_UPLOADED_POSES} eigen poses per preview`;

/**
 * A pose made elsewhere, uploaded by an admin: it joins the other attempts (PoseCandidate) and becomes the current pose,
 * as if it had just been generated. So the next step is approving one pose, never the 3D model by itself. Stored as PNG
 * (what Meshy reads best). Doesn't count towards MAX_POSE_ATTEMPTS: it costs no Gemini credits.
 *
 * On a manual order that isn't paid yet (UPLOADED) the pose waits: the payment moves the preview to POSE_READY instead
 * of PAID (markOrderPaid). A website upload can't get a pose this way: only an order an admin added.
 */
export async function uploadPose(id: string, image: Buffer, adminName: string): Promise<PreviewActionResult> {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: {
      status: true,
      forCollectible: true,
      _count: { select: { poseCandidates: { where: { source: "UPLOADED" } }, orderItems: { where: { order: { createdBy: { not: null } } } } } },
    },
  });
  if (!preview) throw new PreviewNotFoundError(id);
  const waitsForPayment = preview.status === PreviewStatus.UPLOADED && preview._count.orderItems > 0;
  const stays = preview.status === PreviewStatus.POSE_READY || waitsForPayment;
  if (!stays && !canTransition(preview.status, PreviewStatus.POSE_READY)) {
    throw new PreviewConflictError(
      preview.status === PreviewStatus.UPLOADED
        ? "Een pose uploaden kan pas als de preview betaald is"
        : "Dit model is al goedgekeurd of wordt gemaakt: de pose ligt vast",
    );
  }
  if (preview._count.poseCandidates >= MAX_UPLOADED_POSES) throw new PreviewConflictError(TOO_MANY_POSE_UPLOADS);

  let png: Buffer;
  try {
    png = await sharp(image).rotate().png().toBuffer();
  } catch {
    throw new InvalidPoseImageError();
  }
  const key = poseImageKey(id, "image/png");
  await putObject(key, png, "image/png");
  // The current model was made from another pose: it goes, like with a new generated pose. The earlier poses stay.
  const replaced = await prisma.preview.findUniqueOrThrow({ where: { id }, select: { glbKey: true, objKey: true, mtlKey: true, textureKey: true } });
  const saved = await prisma.$transaction(async (tx) => {
    const { count } = await tx.preview.updateMany({
      where: { id, status: preview.status },
      data: {
        status: stays ? preview.status : PreviewStatus.POSE_READY,
        poseImageKey: key,
        error: null,
        ...NO_MODEL,
        meshyTaskId: null,
      },
    });
    if (count === 0) return false;
    await tx.poseCandidate.create({ data: { previewId: id, key, source: "UPLOADED", createdBy: adminName } });
    return true;
  });
  if (!saved) {
    await deleteReplacedFiles([key]);
    throw new PreviewConflictError("Status is intussen gewijzigd");
  }
  await deleteReplacedFiles(modelKeyList(replaced));
  return { previewId: id, status: stays ? preview.status : PreviewStatus.POSE_READY };
}

/**
 * Approves one specific pose of all the attempts: it becomes the current pose and Meshy makes the 3D model from it (the
 * same step as "Pose goedkeuren"). The model of another pose stays until the new one is in (syncModelTask replaces it).
 */
export async function approvePoseCandidate(id: string, candidateId: string, adminName: string): Promise<PreviewActionResult> {
  const [preview, candidate] = await Promise.all([
    prisma.preview.findUnique({ where: { id }, select: { status: true, poseImageKey: true } }),
    prisma.poseCandidate.findFirst({ where: { id: candidateId, previewId: id }, select: { key: true } }),
  ]);
  if (!preview || !candidate) throw new PreviewNotFoundError(candidateId);
  assertTransition(preview.status, PreviewStatus.GENERATING_MODEL);

  if (preview.poseImageKey !== candidate.key) {
    const { count } = await prisma.preview.updateMany({ where: { id, status: preview.status }, data: { poseImageKey: candidate.key } });
    if (count === 0) throw new PreviewConflictError("Status is intussen gewijzigd");
  }
  return startModelGeneration(id, adminName);
}

/** The prompt for the next pose of a new collectible's model. Customers' Palleys follow the settings. */
export async function setPromptOverride(id: string, prompt: string) {
  const { count } = await prisma.preview.updateMany({ where: { id, forCollectible: true }, data: { promptOverride: prompt } });
  if (count === 0) {
    const exists = await prisma.preview.count({ where: { id } });
    if (!exists) throw new PreviewNotFoundError(id);
    throw new PreviewConflictError("Alleen bij een nieuwe collectible kun je de prompt per preview aanpassen");
  }
  return { previewId: id };
}

export async function generatePose(id: string): Promise<PreviewActionResult> {
  const preview = await prisma.preview.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { createdAt: "asc" }, select: { key: true } },
    },
  });
  if (!preview) throw new PreviewNotFoundError(id);

  assertTransition(preview.status, PreviewStatus.GENERATING_POSE);

  if (preview.photos.length === 0) {
    throw new PreviewConflictError("No photos to build a pose from");
  }
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
    const images = await Promise.all(
      preview.photos.map((photo) => getObject(photo.key)),
    );
    const { prompts } = await getShopSettings();
    const prompt = preview.promptOverride?.trim() || posePrompt(prompts, preview.animalType);
    const pose = await geminiGeneratePose({ images, prompt });

    const key = poseImageKey(id, pose.mimeType);
    await putObject(key, pose.image, pose.mimeType);

    // Een nieuwe pose maakt een bestaand model ongeldig. De vorige pose blijft: de admin vergelijkt en kiest er één.
    await prisma.$transaction([
      prisma.preview.update({
        where: { id },
        data: {
          status: PreviewStatus.POSE_READY,
          poseImageKey: key,
          ...NO_MODEL,
          meshyTaskId: null,
        },
      }),
      prisma.poseCandidate.create({ data: { previewId: id, key, source: "GENERATED" } }),
    ]);
    await deleteReplacedFiles(modelKeyList(preview));

    return { previewId: id, status: PreviewStatus.POSE_READY };
  } catch (err) {
    await prisma.preview.updateMany({
      where: { id, status: PreviewStatus.GENERATING_POSE },
      data: { status: PreviewStatus.FAILED, error: toErrorMessage(err) },
    });
    throw err;
  }
}

// Pose goedkeuren in the backoffice: the pose becomes a 3D model, and for the customer the order is now in production.
export async function startModelGeneration(
  id: string,
  adminName: string,
): Promise<PreviewActionResult> {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: {
      status: true,
      poseImageKey: true,
      orderItems: {
        select: {
          quantity: true,
          cancelledQuantity: true,
          returnItems: { where: { returnRequest: { type: "CANCELLATION", status: { in: OPEN_RETURN_STATUSES } } }, select: { id: true } },
        },
      },
    },
  });
  if (!preview) throw new PreviewNotFoundError(id);

  assertTransition(preview.status, PreviewStatus.GENERATING_MODEL);
  // The customer asked to cancel this Palley (or it's cancelled): making it would cost credits and break the promise.
  if (preview.orderItems.some((item) => item.returnItems.length > 0)) {
    throw new PreviewConflictError("Er loopt een annulering voor deze Palley: handel die eerst af bij Retour");
  }
  if (preview.orderItems.length > 0 && preview.orderItems.every((item) => activeQuantity(item) <= 0)) {
    throw new PreviewConflictError("Deze Palley is geannuleerd");
  }

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
  } catch (err) {
    await prisma.preview.updateMany({
      where: { id, status: PreviewStatus.GENERATING_MODEL },
      data: { status: PreviewStatus.FAILED, error: toErrorMessage(err) },
    });
    throw err;
  }
  // Which of the attempts was approved, for the record (a pose from before the candidates has no row).
  await prisma.poseCandidate.updateMany({ where: { previewId: id, key: poseKey }, data: { approvedAt: new Date(), approvedBy: adminName } });
  // Outside the try: the model is on its way whatever happens with the mail.
  await startProductionForPreview(id, adminName);
  return { previewId: id, status: PreviewStatus.GENERATING_MODEL };
}

const SYNC_SELECT = {
  id: true,
  status: true,
  meshyTaskId: true,
  glbKey: true,
  objKey: true,
  mtlKey: true,
  textureKey: true,
} as const;

type SyncablePreview = ModelFileKeys & {
  id: string;
  status: PreviewStatus;
  meshyTaskId: string | null;
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

  const urls = task.status === "SUCCEEDED" ? getModelFileUrls(task) : null;
  if (!urls) {
    await prisma.preview.updateMany({
      where: lock,
      data: {
        status: PreviewStatus.FAILED,
        error:
          task.status === "SUCCEEDED"
            ? "Meshy result is missing glb, obj, mtl or texture"
            : task.task_error?.message ||
              `Meshy task ended with status ${task.status}`,
      },
    });
    return { previewId: preview.id, status: PreviewStatus.FAILED };
  }

  // Vanaf hier: fouten in download of opslag zetten de preview NIET op FAILED.
  // De taak bij Meshy blijft geldig, dus een volgende sync kan het opnieuw proberen.
  const [glb, obj, mtl, texture] = await Promise.all([
    downloadModel(urls.glb),
    downloadModel(urls.obj),
    downloadModel(urls.mtl),
    downloadModel(urls.texture),
  ]);

  const keys = modelKeys(preview.id, taskId);
  await Promise.all([
    putObject(keys.glbKey, glb, "model/gltf-binary"),
    putObject(keys.objKey, obj, "model/obj"),
    putObject(keys.mtlKey, mtl, "model/mtl"),
    putObject(keys.textureKey, texture, "image/png"),
  ]);

  const { count } = await prisma.preview.updateMany({
    where: lock,
    data: {
      status: PreviewStatus.MODEL_READY,
      ...keys,
      downloadedAt: null,
      downloadedBy: null,
    },
  });
  if (count === 0) return unchanged; // iemand anders was ons voor

  // Oude bestanden weg, behalve als het dezelfde keys zijn (zelfde taak).
  const newKeys = modelKeyList(keys);
  await deleteReplacedFiles(
    modelKeyList(preview).filter((key) => !newKeys.includes(key)),
  );
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

// Vraagt de stand op bij Meshy voor de previewpagina. Mag de pagina nooit
// laten crashen: lukt het niet, dan tonen we gewoon geen voortgang.
async function getMeshyProgress(taskId: string): Promise<MeshyProgress | null> {
  try {
    const task = await getImageTo3dTask(taskId);
    return {
      status: task.status,
      progress: task.progress ?? null,
      precedingTasks: task.preceding_tasks ?? null,
    };
  } catch (err) {
    console.error("Could not fetch Meshy progress:", toErrorMessage(err));
    return null;
  }
}

async function getPrintName(id: string) {
  return printBaseName(await prisma.preview.findUniqueOrThrow({ where: { id }, select: PRINT_NAME_SELECT }));
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
      quantity: true,
      createdAt: true,
      poseImageKey: true,
      poseCandidates: {
        orderBy: { createdAt: "asc" },
        select: { id: true, key: true, source: true, createdBy: true, createdAt: true, approvedAt: true, approvedBy: true },
      },
      // De betaalde order van deze preview (eigen checkout), voor de link en de opmerking van de klant.
      orderItems: {
        where: { order: { paidAt: { not: null } } },
        orderBy: { order: { paidAt: "desc" } },
        take: 1,
        select: { notes: true, order: { select: { id: true, number: true } } },
      },
      glbKey: true,
      poseAttempts: true,
      animalType: true,
      meshyTaskId: true,
      forCollectible: true,
      processedKey: true,
      collectible: { select: { id: true, modelKey: true } },
      promptOverride: true,
      photos: {
        orderBy: { createdAt: "asc" },
        select: { id: true, key: true, uploadedBy: true },
      },
      statusChanges: {
        orderBy: { createdAt: "desc" },
        select: {
          fromStatus: true,
          toStatus: true,
          reason: true,
          changedBy: true,
          createdAt: true,
        },
      },
    },
  });
  if (!preview) return null;
  const isGeneratingModel =
    preview.status === PreviewStatus.GENERATING_MODEL && preview.meshyTaskId;

  const canApprovePose = canTransition(preview.status, PreviewStatus.GENERATING_MODEL);
  let generatedNr = 0;
  const [photos, poseImageUrl, glbUrl, meshyProgress, poseCandidates] = await Promise.all([
    Promise.all(
      preview.photos.map(async (photo) => ({
        id: photo.id,
        url: await createDownloadUrl(photo.key),
        uploadedBy: photo.uploadedBy,
      })),
    ),
    signedUrlOrNull(preview.poseImageKey),
    signedUrlOrNull(preview.glbKey),
    isGeneratingModel
      ? getMeshyProgress(preview.meshyTaskId!)
      : Promise.resolve(null),
    Promise.all(
      preview.poseCandidates.map(async (candidate) => ({
        id: candidate.id,
        url: await createDownloadUrl(candidate.key),
        source: candidate.source,
        label: candidate.source === "GENERATED" ? `Poging ${++generatedNr}` : "Eigen pose",
        createdBy: candidate.createdBy,
        createdAt: candidate.createdAt.toISOString(),
        approvedAt: candidate.approvedAt?.toISOString() ?? null,
        approvedBy: candidate.approvedBy,
        current: candidate.key === preview.poseImageKey,
      })),
    ),
  ]);
  const uploadedPoses = preview.poseCandidates.filter((candidate) => candidate.source === "UPLOADED").length;

  return {
    id: preview.id,
    status: preview.status,
    email: preview.email,
    error: preview.error,
    order: preview.orderItems[0]
      ? { ...preview.orderItems[0].order, notes: preview.orderItems[0].notes }
      : null,
    printName: await getPrintName(preview.id),
    quantity: preview.quantity,
    createdAt: preview.createdAt.toISOString(),
    photos,
    canAddPhoto: photos.length < MAX_PHOTOS_PER_PREVIEW,
    canDeletePhoto: photos.length > 1,
    statusChanges: preview.statusChanges.map((change) => ({
      ...change,
      createdAt: change.createdAt.toISOString(),
    })),
    poseImageUrl,
    poseCandidates,
    canApprovePose,
    canUploadPose:
      (preview.status === PreviewStatus.POSE_READY ||
        preview.status === PreviewStatus.UPLOADED ||
        canTransition(preview.status, PreviewStatus.POSE_READY)) &&
      uploadedPoses < MAX_UPLOADED_POSES,
    uploadedPosesLeft: Math.max(0, MAX_UPLOADED_POSES - uploadedPoses),
    glbUrl,
    animalType: preview.animalType,
    meshyTaskId: preview.meshyTaskId,
    meshyProgress,
    // A collectible needn't be one of the shop's animals (a lion, a dragon); a customer's Palley needs its species.
    canApprove:
      canTransition(preview.status, PreviewStatus.APPROVED) &&
      (preview.animalType !== null || preview.forCollectible),
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
    forCollectible: preview.forCollectible,
    collectibleId: preview.collectible?.id ?? null,
    canAttachModel:
      preview.forCollectible &&
      !preview.collectible?.modelKey &&
      preview.status === PreviewStatus.PRINT_READY &&
      preview.processedKey !== null,
    prompt: preview.promptOverride?.trim() || posePrompt((await getShopSettings()).prompts, preview.animalType),
  };
}

const REVIEWABLE_STATUSES = [
  ...new Set([
    ...statusesThatCanTransitionTo(PreviewStatus.GENERATING_POSE),
    ...statusesThatCanTransitionTo(PreviewStatus.GENERATING_MODEL),
    ...statusesThatCanTransitionTo(PreviewStatus.MODEL_READY), // wacht op Meshy
    ...statusesThatCanTransitionTo(PreviewStatus.APPROVED),
  ]),
];

export async function listPreviewsForReview(): Promise<ReviewListItem[]> {
  const previews = await prisma.preview.findMany({
    where: { status: { in: REVIEWABLE_STATUSES } },
    orderBy: { createdAt: "asc" },
    take: REVIEW_LIST_LIMIT,
    select: {
      status: true,
      email: true,
      error: true,
      createdAt: true,
      quantity: true,
      photos: { orderBy: { createdAt: "asc" }, select: { key: true } },
      ...PRINT_NAME_SELECT,
    },
  });

  // Signed URL's maken gebeurt lokaal (geen request naar R2), dus ook voor
  // 100 previews met 4 foto's blijft dit snel.
  return Promise.all(
    previews.map(async (preview) => ({
      id: preview.id,
      status: preview.status,
      email: preview.email,
      error: preview.error,
      createdAt: preview.createdAt.toISOString(),
      orderNumber: paidOrderNumber(preview),
      printName: printBaseName(preview),
      forCollectible: preview.forCollectible,
      quantity: preview.quantity,
      photoUrls: await Promise.all(
        preview.photos.map((photo) => createDownloadUrl(photo.key)),
      ),
    })),
  );
}

const APPROVED_STATUSES = [PreviewStatus.APPROVED, PreviewStatus.PRINT_READY];

// Goedgekeurd én alle drie de printbestanden aanwezig. Previews van vóór de
// overstap naar OBJ hebben alleen een GLB en vallen hier dus buiten.
const DOWNLOADABLE = {
  status: { in: APPROVED_STATUSES },
  objKey: { not: null },
  mtlKey: { not: null },
  textureKey: { not: null },
};

export async function listApprovedModels() {
  // Alleen wat nog naar Blender moet. Verwerkte modellen staan op Processed.
  const previews = await prisma.preview.findMany({
    where: { ...DOWNLOADABLE, status: PreviewStatus.APPROVED },
    orderBy: { createdAt: "asc" },
    select: {
      status: true,
      quantity: true,
      createdAt: true,
      downloadedAt: true,
      downloadedBy: true,
      ...PRINT_NAME_SELECT,
    },
  });

  return previews.map((p) => ({
    id: p.id,
    printName: printBaseName(p),
    status: p.status,
    quantity: p.quantity,
    createdAt: p.createdAt.toISOString(),
    downloadedAt: p.downloadedAt?.toISOString() ?? null,
    downloadedBy: p.downloadedBy,
  }));
}

// Markeert de modellen als gedownload en geeft per model drie downloadlinks
// terug: OBJ, MTL en PNG, met dezelfde basisnaam zodat ze samen horen.
// Markeert de modellen als gedownload en geeft per model de printnaam en
// drie signed URL's terug. De browser maakt er zelf de zip(s) van.
export async function downloadModels(
  previewIds: string[],
  adminName: string,
): Promise<PrintDownload[]> {
  const previews = await prisma.preview.findMany({
    where: { id: { in: previewIds }, ...DOWNLOADABLE },
    orderBy: { createdAt: "asc" },
    select: {
      objKey: true,
      mtlKey: true,
      textureKey: true,
      ...PRINT_NAME_SELECT,
    },
  });

  await prisma.preview.updateMany({
    where: { id: { in: previews.map((p) => p.id) } },
    data: { downloadedAt: new Date(), downloadedBy: adminName },
  });

  return Promise.all(
    previews.map(async (p) => {
      const [obj, mtl, texture] = await Promise.all([
        createDownloadUrl(p.objKey!),
        createDownloadUrl(p.mtlKey!),
        createDownloadUrl(p.textureKey!),
      ]);
      return {
        previewId: p.id,
        baseName: printBaseName(p),
        urls: { obj, mtl, texture },
      };
    }),
  );
}

// Alles voor de dashboardpagina in één aanroep: tellingen + zoekresultaten.
export async function getAdminDashboard(query = ""): Promise<AdminDashboard> {
  const q = query.trim();

  const [byStatus, toDownload, results] = await Promise.all([
    prisma.preview.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.preview.count({ where: { ...DOWNLOADABLE, downloadedAt: null } }),
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

// Zoekt op preview-id (exact), PRV-ref, e-mail of ordernummer (deel van).
async function searchPreviews(q: string): Promise<AdminPreviewListItem[]> {
  const isId = z.uuid().safeParse(q).success;
  const refPrefix = parsePreviewRef(q.toUpperCase());

  const previews = await prisma.preview.findMany({
    where: isId
      ? { id: q }
      : {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { orderItems: { some: { order: { number: { contains: q, mode: "insensitive" } } } } },
            ...(refPrefix ? [{ id: { startsWith: refPrefix } }] : []),
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
