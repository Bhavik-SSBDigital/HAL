/*
  Warnings:

  - You are about to drop the column `rejectedAt` on the `ProcessDocument` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `ProcessDocument` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProcessDocument" DROP COLUMN "rejectedAt",
DROP COLUMN "rejectionReason";

-- CreateTable
CREATE TABLE "DocumentRejection" (
    "id" TEXT NOT NULL,
    "processDocumentId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "reason" TEXT,
    "rejectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "byRecommender" BOOLEAN NOT NULL DEFAULT false,
    "isAttachedWithRecommendation" BOOLEAN NOT NULL DEFAULT false,
    "processStepInstanceId" TEXT,

    CONSTRAINT "DocumentRejection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DocumentRejection" ADD CONSTRAINT "DocumentRejection_processDocumentId_fkey" FOREIGN KEY ("processDocumentId") REFERENCES "ProcessDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRejection" ADD CONSTRAINT "DocumentRejection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRejection" ADD CONSTRAINT "DocumentRejection_processStepInstanceId_fkey" FOREIGN KEY ("processStepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
