import "server-only";
import { randomUUID } from "node:crypto";
import { prisma, PreviewStatus } from "@/db/client";
import type { AnimalType } from "@/data/animals";
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
  printFileBaseName,
  toErrorMessage,
  unpaidExpiry,
  isPhotoKeyOf,
  photoKey,
} from "./utils";
import type {
  AdminDashboard,
  AdminPreviewDetail,
  AdminPreviewListItem,
  CreateUploadInput,
  PrintDownload,
  PreviewActionResult,
  PhotoInput,
  ReviewListItem,
  StatusOverrideInput,
} from "./types";

import { MAX_PHOTOS_PER_PREVIEW } from "@/data/uploads";

import { z } from "zod";
import { MAX_POSE_ATTEMPTS } from "@/data/pipeline";
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

export async function approvePreview(id: string) {
  const preview = await prisma.preview.findUnique({
    where: { id },
    select: { status: true, animalType: true },
  });
  if (!preview) throw new PreviewNotFoundError();

  assertTransition(preview.status, PreviewStatus.APPROVED);
  // Het diersoort staat in de bestandsnaam van de print: eerst kiezen.
  if (!preview.animalType) {
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

  return { previewId: id, status: PreviewStatus.APPROVED };
}

// Mag in elke status: ook na goedkeuring kan een vergissing rechtgezet worden.
export async function setAnimalType(id: string, animalType: AnimalType) {
  const { count } = await prisma.preview.updateMany({
    where: { id },
    data: { animalType },
  });
  if (count === 0) throw new PreviewNotFoundError(id);
  return { previewId: id, animalType };
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
    const pose = await geminiGeneratePose({ images });

    const key = poseImageKey(id, pose.mimeType);
    await putObject(key, pose.image, pose.mimeType);

    // Een nieuwe pose maakt een bestaand model ongeldig.
    await prisma.preview.update({
      where: { id },
      data: {
        status: PreviewStatus.POSE_READY,
        poseImageKey: key,
        ...NO_MODEL,
        meshyTaskId: null,
      },
    });
    await deleteReplacedFiles([preview.poseImageKey, ...modelKeyList(preview)]);

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
      poseImageKey: true,
      glbKey: true,
      poseAttempts: true,
      animalType: true,
      meshyTaskId: true,
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

  const [photos, poseImageUrl, glbUrl] = await Promise.all([
    Promise.all(
      preview.photos.map(async (photo) => ({
        id: photo.id,
        url: await createDownloadUrl(photo.key),
        uploadedBy: photo.uploadedBy,
      })),
    ),
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
    photos,
    canAddPhoto: photos.length < MAX_PHOTOS_PER_PREVIEW,
    canDeletePhoto: photos.length > 1,
    statusChanges: preview.statusChanges.map((change) => ({
      ...change,
      createdAt: change.createdAt.toISOString(),
    })),
    poseImageUrl,
    glbUrl,
    animalType: preview.animalType,
    canApprove:
      canTransition(preview.status, PreviewStatus.APPROVED) &&
      preview.animalType !== null,
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
      id: true,
      status: true,
      email: true,
      error: true,
      createdAt: true,
      photos: { orderBy: { createdAt: "asc" }, select: { key: true } },
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
  const previews = await prisma.preview.findMany({
    where: DOWNLOADABLE,
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
      id: true,
      objKey: true,
      mtlKey: true,
      textureKey: true,
      shopifyOrderNumber: true,
      animalType: true,
      paidAt: true,
      createdAt: true,
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
        baseName: printFileBaseName(p),
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
