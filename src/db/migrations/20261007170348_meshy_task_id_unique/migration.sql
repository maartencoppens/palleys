/*
  Warnings:

  - A unique constraint covering the columns `[meshyTaskId]` on the table `Preview` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Preview_meshyTaskId_key" ON "Preview"("meshyTaskId");
