-- CreateEnum
CREATE TYPE "DocumentActionType" AS ENUM ('UPLOADED', 'REPLACED', 'REJECTED', 'SIGNED', 'FEEDBACK');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_QUERY';

-- AlterEnum
ALTER TYPE "StepStatus" ADD VALUE 'FOR_RECIRCULATION';

-- AlterTable
ALTER TABLE "AssignmentProgress" ADD COLUMN     "peerApprovalRequired" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "ProcessDocument" ADD COLUMN     "isReplacement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "replacedDocumentId" INTEGER;

-- AlterTable
ALTER TABLE "ProcessInstance" ADD COLUMN     "isRecirculated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DocumentHistory" (
    "id" TEXT NOT NULL,
    "documentId" INTEGER NOT NULL,
    "processId" TEXT NOT NULL,
    "stepInstanceId" TEXT,
    "userId" INTEGER NOT NULL,
    "actionType" "DocumentActionType" NOT NULL,
    "actionDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replacedDocumentId" INTEGER,
    "isRecirculationTrigger" BOOLEAN NOT NULL DEFAULT false,
    "processDocumentId" TEXT,

    CONSTRAINT "DocumentHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProcessDocument" ADD CONSTRAINT "ProcessDocument_replacedDocumentId_fkey" FOREIGN KEY ("replacedDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_replacedDocumentId_fkey" FOREIGN KEY ("replacedDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_processDocumentId_fkey" FOREIGN KEY ("processDocumentId") REFERENCES "ProcessDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
