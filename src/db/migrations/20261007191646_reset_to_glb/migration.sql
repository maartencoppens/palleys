/*
  Warnings:

  - You are about to drop the column `mtlKey` on the `Preview` table. All the data in the column will be lost.
  - You are about to drop the column `objKey` on the `Preview` table. All the data in the column will be lost.
  - You are about to drop the column `texturePngKey` on the `Preview` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Preview" DROP COLUMN "mtlKey",
DROP COLUMN "objKey",
DROP COLUMN "texturePngKey",
ADD COLUMN     "glbKey" TEXT;
