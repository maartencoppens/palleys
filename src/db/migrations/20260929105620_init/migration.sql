-- CreateEnum
CREATE TYPE "PreviewStatus" AS ENUM ('UPLOADED', 'GENERATING_POSE', 'POSE_READY', 'GENERATING_MODEL', 'MODEL_READY', 'ORDERED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Preview" (
    "id" TEXT NOT NULL,
    "status" "PreviewStatus" NOT NULL DEFAULT 'UPLOADED',
    "originalPhotoKey" TEXT,
    "poseImageKey" TEXT,
    "glbKey" TEXT,
    "meshyTaskId" TEXT,
    "email" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preview_pkey" PRIMARY KEY ("id")
);
