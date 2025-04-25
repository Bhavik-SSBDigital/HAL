/*
  Warnings:

  - You are about to drop the column `workflowStepId` on the `ProcessStepInstance` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProcessStepInstance" DROP CONSTRAINT "ProcessStepInstance_workflowStepId_fkey";

-- AlterTable
ALTER TABLE "ProcessStepInstance" DROP COLUMN "workflowStepId",
ADD COLUMN     "stepId" TEXT;

-- AddForeignKey
ALTER TABLE "ProcessStepInstance" ADD CONSTRAINT "ProcessStepInstance_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
