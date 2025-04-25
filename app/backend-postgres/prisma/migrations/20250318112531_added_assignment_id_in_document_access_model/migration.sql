/*
  Warnings:

  - Added the required column `assignmentId` to the `DocumentAccess` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocumentAccess" ADD COLUMN     "assignmentId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "WorkflowAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
