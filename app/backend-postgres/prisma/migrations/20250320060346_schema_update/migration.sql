/*
  Warnings:

  - You are about to drop the column `comments` on the `ProcessStepInstance` table. All the data in the column will be lost.
  - You are about to drop the column `pickedAt` on the `ProcessStepInstance` table. All the data in the column will be lost.
  - You are about to drop the column `stepId` on the `ProcessStepInstance` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProcessStepInstance" DROP CONSTRAINT "ProcessStepInstance_stepId_fkey";

-- AlterTable
ALTER TABLE "ProcessStepInstance" DROP COLUMN "comments",
DROP COLUMN "pickedAt",
DROP COLUMN "stepId",
ADD COLUMN     "assignmentId" TEXT,
ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "departmentId" INTEGER,
ADD COLUMN     "progressId" TEXT,
ADD COLUMN     "roleId" INTEGER,
ADD COLUMN     "workflowStepId" TEXT;

-- CreateTable
CREATE TABLE "AssignmentProgress" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "currentLevel" INTEGER,
    "roleHierarchy" JSONB,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AssignmentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentStepProgress" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "roleLevels" JSONB NOT NULL,
    "currentLevel" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "direction" "Direction" NOT NULL,
    "completedRoles" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "requiredRoles" INTEGER[],

    CONSTRAINT "DepartmentStepProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentProgress_assignmentId_processId_key" ON "AssignmentProgress"("assignmentId", "processId");

-- CreateIndex
CREATE INDEX "ProcessStepInstance_assignmentId_idx" ON "ProcessStepInstance"("assignmentId");

-- AddForeignKey
ALTER TABLE "AssignmentProgress" ADD CONSTRAINT "AssignmentProgress_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "WorkflowAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentProgress" ADD CONSTRAINT "AssignmentProgress_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepInstance" ADD CONSTRAINT "ProcessStepInstance_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "WorkflowAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepInstance" ADD CONSTRAINT "ProcessStepInstance_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "AssignmentProgress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepInstance" ADD CONSTRAINT "ProcessStepInstance_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentStepProgress" ADD CONSTRAINT "DepartmentStepProgress_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentStepProgress" ADD CONSTRAINT "DepartmentStepProgress_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentStepProgress" ADD CONSTRAINT "DepartmentStepProgress_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
