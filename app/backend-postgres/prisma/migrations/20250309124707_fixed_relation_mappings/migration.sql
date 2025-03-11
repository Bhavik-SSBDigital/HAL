/*
  Warnings:

  - You are about to drop the column `escalationTime` on the `ProcessInstance` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ProcessStepInstance` table. All the data in the column will be lost.
  - The `assignedTo` column on the `ProcessStepInstance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `previousWorkflowId` on the `Workflow` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('UPWARDS', 'DOWNWARDS');

-- DropForeignKey
ALTER TABLE "ProcessStepInstance" DROP CONSTRAINT "ProcessStepInstance_pickedById_fkey";

-- DropForeignKey
ALTER TABLE "Workflow" DROP CONSTRAINT "Workflow_previousWorkflowId_fkey";

-- AlterTable
ALTER TABLE "ProcessDocument" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" INTEGER,
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "ProcessInstance" DROP COLUMN "escalationTime",
ADD COLUMN     "customizations" JSONB;

-- AlterTable
ALTER TABLE "ProcessStepInstance" DROP COLUMN "updatedAt",
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "pickedAt" TIMESTAMP(3),
DROP COLUMN "assignedTo",
ADD COLUMN     "assignedTo" INTEGER[],
ALTER COLUMN "pickedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Workflow" DROP COLUMN "previousWorkflowId",
ADD COLUMN     "autoApprovalAfter" INTEGER DEFAULT 168,
ADD COLUMN     "escalationTime" INTEGER DEFAULT 48,
ADD COLUMN     "previousVersionId" TEXT,
ALTER COLUMN "version" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "WorkflowAssignment" ADD COLUMN     "direction" "Direction",
ADD COLUMN     "selectedRoles" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "WorkflowStep" ADD COLUMN     "autoApprovalAfter" INTEGER DEFAULT 72,
ADD COLUMN     "escalationTime" INTEGER DEFAULT 24,
ADD COLUMN     "requiresDocument" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stepType" "StepType" NOT NULL DEFAULT 'APPROVAL';

-- CreateTable
CREATE TABLE "DocumentSignature" (
    "id" TEXT NOT NULL,
    "processDocumentId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "reason" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentSignature_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepInstance" ADD CONSTRAINT "ProcessStepInstance_pickedById_fkey" FOREIGN KEY ("pickedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDocument" ADD CONSTRAINT "ProcessDocument_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_processDocumentId_fkey" FOREIGN KEY ("processDocumentId") REFERENCES "ProcessDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
