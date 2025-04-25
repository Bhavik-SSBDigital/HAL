/*
  Warnings:

  - You are about to drop the column `assignmentId` on the `DocumentAccess` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DocumentAccess" DROP CONSTRAINT "DocumentAccess_assignmentId_fkey";

-- AlterTable
ALTER TABLE "DocumentAccess" DROP COLUMN "assignmentId";

-- AlterTable
ALTER TABLE "WorkflowAssignment" ADD COLUMN     "accessTypes" "AccessType"[] DEFAULT ARRAY[]::"AccessType"[];

-- CreateTable
CREATE TABLE "DepartmentRoleAssignment" (
    "id" SERIAL NOT NULL,
    "workflowAssignmentId" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "DepartmentRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentRoleAssignment_workflowAssignmentId_departmentId__key" ON "DepartmentRoleAssignment"("workflowAssignmentId", "departmentId", "roleId");

-- AddForeignKey
ALTER TABLE "DepartmentRoleAssignment" ADD CONSTRAINT "DepartmentRoleAssignment_workflowAssignmentId_fkey" FOREIGN KEY ("workflowAssignmentId") REFERENCES "WorkflowAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentRoleAssignment" ADD CONSTRAINT "DepartmentRoleAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentRoleAssignment" ADD CONSTRAINT "DepartmentRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
