/*
  Warnings:

  - Added the required column `pickedById` to the `ProcessStepInstance` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('READ', 'EDIT', 'DOWNLOAD');

-- AlterTable
ALTER TABLE "ProcessStepInstance" ADD COLUMN     "pickedById" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "WorkflowStep" ADD COLUMN     "direction" TEXT DEFAULT 'downwards',
ADD COLUMN     "isHierarchical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selectedRoles" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateTable
CREATE TABLE "ProcessWorkflowVersion" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "oldVersion" INTEGER NOT NULL,
    "newVersion" INTEGER NOT NULL,
    "migratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessWorkflowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccess" (
    "id" TEXT NOT NULL,
    "stepInstanceId" TEXT,
    "assignmentId" TEXT,
    "documentId" INTEGER NOT NULL,
    "accessType" "AccessType" NOT NULL,
    "processId" TEXT,

    CONSTRAINT "DocumentAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessNotification" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "ProcessNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessClaim" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "WorkflowAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessNotification" ADD CONSTRAINT "ProcessNotification_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProcessStepInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessNotification" ADD CONSTRAINT "ProcessNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessClaim" ADD CONSTRAINT "ProcessClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepInstance" ADD CONSTRAINT "ProcessStepInstance_pickedById_fkey" FOREIGN KEY ("pickedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
