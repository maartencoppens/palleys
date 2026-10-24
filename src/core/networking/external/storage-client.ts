import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  NotFound,
} from "@aws-sdk/client-s3";
import { env } from "@/core/utils/env";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  DOWNLOAD_URL_TTL_SECONDS,
  UPLOAD_URL_TTL_SECONDS,
} from "@/data/storage";

const bucket = env.R2_BUCKET;

const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  // Nieuwere AWS SDK-versies voegen standaard checksums toe die
  // presigned uploads naar R2 kunnen breken. Verifieer bij jouw versie.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export async function createUploadUrl(key: string, contentType: string) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );
}

export async function createDownloadUrl(key: string, downloadName?: string) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      // Laat de browser het bestand opslaan in plaats van het te openen.
      ResponseContentDisposition: downloadName
        ? `attachment; filename="${downloadName}"`
        : undefined,
    }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
  );
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObject(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return Buffer.from(await res.Body!.transformToByteArray());
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// Bestaat het bestand echt? Gebruikt na een upload via signed URL, want die
// gaat rechtstreeks van de browser naar R2 en niet via onze server.
export async function objectExists(key: string) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error instanceof NotFound) return false;
    throw error;
  }
}
