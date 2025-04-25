/*
  Warnings:

  - Added the required column `name` to the `ProcessInstance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocumentAccess" ADD COLUMN     "departmentId" INTEGER,
ADD COLUMN     "roleId" INTEGER,
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "ProcessInstance" ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WorkflowAssignment" ADD COLUMN     "allowParallel" BOOLEAN NOT NULL DEFAULT false;
