/*
  Warnings:

  - A unique constraint covering the columns `[assignmentProgressId]` on the table `DepartmentStepProgress` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[processId,stepId,departmentId]` on the table `DepartmentStepProgress` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DepartmentStepProgress" ADD COLUMN     "assignmentProgressId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentStepProgress_assignmentProgressId_key" ON "DepartmentStepProgress"("assignmentProgressId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentStepProgress_processId_stepId_departmentId_key" ON "DepartmentStepProgress"("processId", "stepId", "departmentId");

-- AddForeignKey
ALTER TABLE "DepartmentStepProgress" ADD CONSTRAINT "DepartmentStepProgress_assignmentProgressId_fkey" FOREIGN KEY ("assignmentProgressId") REFERENCES "AssignmentProgress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
