-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "inBin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;
