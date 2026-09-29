/*
  Warnings:

  - The values [ORDERED] on the enum `PreviewStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PreviewStatus_new" AS ENUM ('UPLOADED', 'PAID', 'GENERATING_POSE', 'POSE_READY', 'GENERATING_MODEL', 'MODEL_READY', 'APPROVED', 'PRINT_READY', 'FAILED', 'EXPIRED');
ALTER TABLE "public"."Preview" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Preview" ALTER COLUMN "status" TYPE "PreviewStatus_new" USING ("status"::text::"PreviewStatus_new");
ALTER TYPE "PreviewStatus" RENAME TO "PreviewStatus_old";
ALTER TYPE "PreviewStatus_new" RENAME TO "PreviewStatus";
DROP TYPE "public"."PreviewStatus_old";
ALTER TABLE "Preview" ALTER COLUMN "status" SET DEFAULT 'UPLOADED';
COMMIT;
