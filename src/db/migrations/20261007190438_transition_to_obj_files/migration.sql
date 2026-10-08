/*
  Warnings:

  - You are about to drop the column `glbKey` on the `Preview` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Preview" DROP COLUMN "glbKey",
ADD COLUMN     "mtlKey" TEXT,
ADD COLUMN     "objKey" TEXT,
ADD COLUMN     "texturePngKey" TEXT;
