-- CreateEnum
CREATE TYPE "LegalDocumentKind" AS ENUM ('PRIVACY', 'TERMS', 'RETURNS', 'SHIPPING', 'CONTACT');

-- CreateTable
CREATE TABLE "LegalDocumentVersion" (
    "id" TEXT NOT NULL,
    "document" "LegalDocumentKind" NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "content" JSONB NOT NULL,
    "publishedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalDocumentVersion_document_createdAt_idx" ON "LegalDocumentVersion"("document", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocumentVersion_document_version_key" ON "LegalDocumentVersion"("document", "version");
