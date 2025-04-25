-- DropForeignKey
ALTER TABLE "DocumentAccess" DROP CONSTRAINT "DocumentAccess_assignmentId_fkey";

-- AlterTable
ALTER TABLE "DocumentAccess" ALTER COLUMN "assignmentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "WorkflowAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
